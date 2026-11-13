import { GMAIL_STATUS } from '../lib/format'

/** Badge for a Gmail mailbox status (GET /gmail/status, GET /admin/gmail/accounts). */
export default function GmailStatusBadge({ status }) {
  const [label, tone] = GMAIL_STATUS[status] || [status || 'Unknown', '']
  return <span className={`badge ${tone}`}>{label}</span>
}
