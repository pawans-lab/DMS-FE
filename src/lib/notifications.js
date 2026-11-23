// Grouping and labels for the topbar notification dropdown (components/validity/NotificationBell.jsx).
// Works only on what GET /notifications returns (already filtered by the server to documents the user may view).

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** A validity notice older than this is no longer an active alert: the daily check stopped producing it
 *  (renewed, exception accepted, monitoring paused…), so it is listed with the other notifications. */
const ACTIVE_WINDOW_DAYS = 2

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** 'YYYY-MM-DD' → local Date at midnight (not UTC, so the day never shifts), or null. */
function parseDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

function startOfToday() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 'YYYY-MM-DD' → '05 Mar 2026'. */
export function formatDay(value) {
  const d = parseDay(value)
  return d ? `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''
}

/** Days from today to `expiry` (negative once expired), or null. */
export function daysLeft(expiry) {
  const d = parseDay(expiry)
  return d ? Math.round((d - startOfToday()) / DAY) : null
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", then the date. */
export function timeAgo(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "Expired 3 days ago" / "Expires today" / "5 days left". */
export function dueLabel(days) {
  if (days == null) return ''
  if (days < 0) return `${plural(-days, 'day')} overdue`
  if (days === 0) return 'Expires today'
  return `${plural(days, 'day')} left`
}

const isValidity = (n) => n.category === 'validity' && n.entity_type === 'document' && n.entity_id

/**
 * Splits the latest notifications into { expired, expiring, other }.
 *
 * The daily validity check creates one notice per document per day, so validity notices are collapsed
 * to one entry per document (its newest notice). Each entry keeps the ids of every unread notice it
 * stands for, so marking it read clears them all and the unread count stays consistent.
 *
 * - expired: oldest expiry first · expiring (incl. expires today): nearest expiry first
 * - other: everything else (and validity notices that are no longer active), newest first
 */
export function groupNotifications(items) {
  const byDoc = new Map()
  const other = []
  for (const n of items || []) {
    if (!isValidity(n)) {
      other.push({ key: `n${n.id}`, n, unreadIds: n.read ? [] : [n.id] })
      continue
    }
    const entry = byDoc.get(n.entity_id)
    if (!entry) {
      byDoc.set(n.entity_id, { key: `d${n.entity_id}`, n, unreadIds: n.read ? [] : [n.id] })
    } else {
      if (new Date(n.created_at) > new Date(entry.n.created_at)) entry.n = n
      if (!n.read) entry.unreadIds.push(n.id)
    }
  }

  const expired = []
  const expiring = []
  const activeSince = startOfToday().getTime() - ACTIVE_WINDOW_DAYS * DAY
  for (const entry of byDoc.values()) {
    const { n } = entry
    const d = n.details || {}
    const days = d.expiry_date ? daysLeft(d.expiry_date) : (typeof d.days_left === 'number' ? d.days_left : null)
    const active = new Date(n.created_at).getTime() >= activeSince && days != null
    const item = { ...entry, read: entry.unreadIds.length === 0, days, expiry: d.expiry_date || '' }
    if (!active) other.push(item)
    else if (days < 0 || n.kind === 'expired') expired.push(item)
    else expiring.push(item)
  }

  const byExpiry = (a, b) => (a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : 0)
  expired.sort(byExpiry)   // ISO dates sort lexically: oldest expiry (most overdue) first
  expiring.sort(byExpiry)  // nearest expiry first
  other.sort((a, b) => new Date(b.n.created_at) - new Date(a.n.created_at))
  for (const o of other) if (o.read === undefined) o.read = o.unreadIds.length === 0
  return { expired, expiring, other }
}
