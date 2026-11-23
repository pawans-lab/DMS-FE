// Validity status helpers shared by the badge, the document panel and the dashboard.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export const VERIFICATION_LABELS = {
  pending: 'Awaiting analysis',
  requires_confirmation: 'Confirm dates',
  needs_review: 'Needs review',
  verified: 'Verified',
  analysis_failed: 'Analysis failed',
  unsupported: 'Cannot be analysed',
}

/** The validity status of a document (from a validity `summary`): expiry status once verified, otherwise
 *  where it is in the analyse → confirm workflow. */
export function validityChip(summary) {
  if (!summary || !summary.tracked) return null
  const v = summary.verification_status
  if (summary.stale) return { cls: 'badge-primary', icon: 'refresh', text: 'New version: re-check' }
  if (v !== 'verified') {
    const cls = v === 'needs_review' ? 'badge-warn' : v === 'analysis_failed' || v === 'unsupported' ? 'badge-danger' : 'badge-primary'
    return { cls, icon: 'alert', text: VERIFICATION_LABELS[v] || v }
  }
  const d = summary.days_left
  switch (summary.status) {
    case 'expired':
      return summary.accepted
        ? { cls: 'badge-warn', icon: 'shield', text: `Expired ${plural(-d, 'day')} ago · accepted` }
        : { cls: 'badge-danger', icon: 'alert', text: `Expired ${plural(-d, 'day')} ago` }
    case 'expires_today': return { cls: 'badge-danger', icon: 'alert', text: 'Expires today' }
    case 'expiring': return { cls: 'badge-warn', icon: 'clock', text: `Expires in ${plural(d, 'day')}` }
    case 'valid': return { cls: 'badge-ok', icon: 'check', text: `Valid · ${summary.expiry_date}` }
    case 'no_expiry': return { cls: '', icon: 'check', text: 'No expiry date' }
    default: return { cls: '', icon: 'calendar', text: 'Expiry unknown' }
  }
}
