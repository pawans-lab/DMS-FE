import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { listNotifications, readAllNotifications, readNotification, unreadNotifications } from '../../api/validity'
import { dt } from '../../lib/format'
import { dueLabel, formatDay, groupNotifications, timeAgo } from '../../lib/notifications'
import Icon from '../Icon'

/** How many notifications the dropdown loads (the API maximum): enough for one entry per monitored document. */
const FETCH_LIMIT = 200
/** Entries shown per section before "View all". */
const SECTION_LIMIT = 6

function ValidityItem({ item, tone, onOpen, onRead }) {
  const { n, days, expiry, read } = item
  const d = n.details || {}
  const sub = [d.document_type, d.vessel_name && `Vessel: ${d.vessel_name}`].filter(Boolean).join(' · ')
  return (
    <li className={`notif-item tone-${tone}${read ? '' : ' is-unread'}`}>
      <button type="button" className="notif-main" onClick={() => onOpen(item)} title={n.title}>
        <span className="notif-icon" aria-hidden="true"><Icon name={tone === 'danger' ? 'alert' : 'clock'} /></span>
        <span className="notif-body">
          <span className="notif-title">{d.document_name || n.title}</span>
          {sub && <span className="notif-sub">{sub}</span>}
          <span className="notif-meta">
            <Icon name="calendar" /> {tone === 'danger' ? 'Expired' : 'Expires'} {formatDay(expiry)}
            <span className="notif-time" title={dt(n.created_at)}>· {timeAgo(n.created_at)}</span>
          </span>
        </span>
        <span className="notif-pill">{dueLabel(days)}</span>
      </button>
      <ReadDot read={read} onRead={() => onRead(item)} />
    </li>
  )
}

function OtherItem({ item, onOpen, onRead }) {
  const { n, read } = item
  return (
    <li className={`notif-item tone-${n.severity === 'danger' ? 'danger' : n.severity === 'warning' ? 'warn' : 'info'}${read ? '' : ' is-unread'}`}>
      <button type="button" className="notif-main" onClick={() => onOpen(item)}>
        <span className="notif-icon" aria-hidden="true"><Icon name={n.category === 'validity' ? 'calendar' : 'bell'} /></span>
        <span className="notif-body">
          <span className="notif-title">{n.title}</span>
          {n.message && <span className="notif-sub">{n.message}</span>}
          <span className="notif-meta"><span className="notif-time" title={dt(n.created_at)}>{timeAgo(n.created_at)}</span></span>
        </span>
      </button>
      <ReadDot read={read} onRead={() => onRead(item)} />
    </li>
  )
}

function ReadDot({ read, onRead }) {
  if (read) return <span className="notif-read" aria-hidden="true" />
  return (
    <button type="button" className="notif-read" title="Mark as read" aria-label="Mark as read"
      onClick={(e) => { e.stopPropagation(); onRead() }}>
      <span className="notif-unread-dot" />
    </button>
  )
}

function Section({ title, tone, icon, items, viewAll, children }) {
  if (!items.length) return null
  const unread = items.filter((i) => !i.read).length
  return (
    <section className={`notif-section tone-${tone}`}>
      <h3 className="notif-section-head">
        <Icon name={icon} /> {title} <span className="notif-section-count">{items.length}</span>
        {unread > 0 && <span className="notif-section-new">{unread} new</span>}
      </h3>
      <ul className="notif-items">{children(items.slice(0, SECTION_LIMIT))}</ul>
      {items.length > SECTION_LIMIT && viewAll && (
        <Link className="notif-more" to={viewAll}>View all {items.length} <Icon name="chevron" /></Link>
      )}
    </section>
  )
}

/** Topbar notification centre: unread count (refreshed every two minutes) and the latest notifications,
 *  grouped as expired licences, licences expiring soon, then everything else. */
export default function NotificationBell() {
  const navigate = useNavigate()
  const menu = useRef(null)
  const [open, setOpen] = useState(false)
  const count = useQuery({
    queryKey: ['notifications', 'unread'], queryFn: unreadNotifications,
    refetchInterval: 120_000, refetchOnWindowFocus: true, meta: { silent: true },
  })
  const latest = useQuery({
    queryKey: ['notifications', 'latest'], queryFn: () => listNotifications({ limit: FETCH_LIMIT }), enabled: open,
  })
  // One entry can stand for several unread notices of the same document (one per day): mark them all.
  const read = useMutation({ mutationFn: (ids) => Promise.all(ids.map((id) => readNotification(id))) })
  const readAll = useMutation({ mutationFn: readAllNotifications })
  const unread = count.data || 0
  const groups = useMemo(() => groupNotifications(latest.data?.notifications), [latest.data])
  const empty = !groups.expired.length && !groups.expiring.length && !groups.other.length

  const markRead = (item) => { if (item.unreadIds.length) read.mutate(item.unreadIds) }
  const openItem = (item) => {
    markRead(item)
    if (item.n.link) {
      if (menu.current) menu.current.open = false
      navigate(item.n.link)
    }
  }

  return (
    <details ref={menu} className="menu notif-menu" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="icon-btn notif-bell" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} title="Notifications">
        <Icon name="bell" />
        {unread > 0 && <span className="notif-count">{unread > 99 ? '99+' : unread}</span>}
      </summary>
      {/* Following any link inside closes the dropdown. */}
      <div className="menu-list notif-list" onClick={(e) => { if (e.target.closest('a') && menu.current) menu.current.open = false }}>
        <div className="notif-head">
          <strong>Notifications</strong>
          {unread > 0 && <span className="notif-head-count">{unread > 99 ? '99+' : unread} unread</span>}
          {unread > 0 && (
            <button type="button" className="btn btn-ghost btn-xs" disabled={readAll.isPending}
              onClick={(e) => { e.stopPropagation(); readAll.mutate() }}>
              <Icon name="check" /> Mark all as read
            </button>
          )}
        </div>
        <div className="notif-scroll">
          {latest.isPending && <p className="small muted pad">Loading…</p>}
          {latest.isError && <p className="small muted pad">Notifications could not be loaded.</p>}
          {latest.isSuccess && empty && (
            <div className="notif-empty"><Icon name="bell" /><span>You're all caught up.</span></div>
          )}
          <Section title="Expired licences" tone="danger" icon="alert" items={groups.expired} viewAll="/validity?status=expired">
            {(list) => list.map((i) => <ValidityItem key={i.key} item={i} tone="danger" onOpen={openItem} onRead={markRead} />)}
          </Section>
          <Section title="Expiring soon" tone="warn" icon="clock" items={groups.expiring} viewAll="/validity?status=expiring">
            {(list) => list.map((i) => <ValidityItem key={i.key} item={i} tone="warn" onOpen={openItem} onRead={markRead} />)}
          </Section>
          <Section title="Other notifications" tone="info" icon="bell" items={groups.other} viewAll="/notifications">
            {(list) => list.map((i) => <OtherItem key={i.key} item={i} onOpen={openItem} onRead={markRead} />)}
          </Section>
        </div>
        <Link to="/notifications" className="notif-foot">
          <Icon name="bell" /> All notifications &amp; email settings
        </Link>
      </div>
    </details>
  )
}
