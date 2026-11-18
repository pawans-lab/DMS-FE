import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { disconnectGmailAccount, gmailAccounts } from '../../api/admin'
import { gmailRetry } from '../../api/gmail'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import GmailStatusBadge from '../../components/GmailStatusBadge'
import Loading, { QueryError } from '../../components/Loading'
import Pagination from '../../components/Pagination'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'

const PAGE_SIZE = 50

/**
 * Who connected which Gmail mailbox and its sync health → GET /api/v1/admin/gmail/accounts.
 * Status only: administrators cannot open users' emails, so nothing here links to email content.
 */
export default function Mailboxes() {
  useTitle('Mailboxes')
  const [params] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query = useQuery({
    queryKey: ['admin-gmail-accounts', page],
    queryFn: () => gmailAccounts(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  })
  const accounts = query.data?.accounts || []
  const pages = Math.max(1, Math.ceil((query.data?.total || 0) / PAGE_SIZE))
  const anyFailed = accounts.some((a) => a.failed > 0)

  return (
    <>
      <div className="page-head">
        <div><h1>Mailboxes</h1>
          <p className="muted">Gmail mailboxes users have connected for email archiving, and their sync health. Archived emails are private to each user and cannot be opened here. Disconnecting a mailbox revokes its Google access without opening any email.</p></div>
        <div className="actions">
          <ActionButton action={gmailRetry} label="Retry failed" icon="refresh" className={`btn ${anyFailed ? 'btn-primary' : 'btn-secondary'}`}
            title="Queue every mailbox's failed imports for another attempt"
            success={(r) => `${r.queued} failed import(s) queued for retry.`} />
        </div>
      </div>
      <AdminNav />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <>
          <div className="card card-flush"><div className="table-wrap"><table className="table">
            <thead><tr>
              <th>Mailbox</th><th>JMBVault user</th><th>Connected</th><th>Status</th><th className="hide-md">Last sync</th>
              <th className="num">Archived</th><th className="num hide-sm">Pending</th><th className="num">Failed</th><th className="hide-md">Error</th>
              <th className="actions-col"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {accounts.length ? accounts.map((a) => (
                <tr key={a.id}>
                  <td className="break">{a.email}</td>
                  <td>{a.user_id && a.username ? <Link to={`/admin/users/${a.user_id}`}>{a.username}</Link> : <span className="muted">Not claimed</span>}</td>
                  <td>{a.connected ? <span className="badge badge-ok">Yes</span> : <span className="badge">No</span>}{a.connected_at && <><br /><small className="muted">{dt(a.connected_at, 'date')}</small></>}</td>
                  <td><GmailStatusBadge status={a.status} /></td>
                  <td className="hide-md muted nowrap">{a.last_sync_at ? dt(a.last_sync_at) : 'Never'}</td>
                  <td className="num">{a.archived_total}</td>
                  <td className="num hide-sm">{a.pending}</td>
                  <td className="num">{a.failed > 0 ? <span className="badge badge-danger">{a.failed}</span> : a.failed}</td>
                  <td className="hide-md small break">{a.error || ''}</td>
                  <td className="actions-col">
                    {a.connected && (
                      <ActionButton action={() => disconnectGmailAccount(a.id)} label="Disconnect" icon="link"
                        className="btn btn-ghost btn-sm btn-danger-text" title={`Disconnect ${a.email}`}
                        confirm={`Disconnect the mailbox ${a.email}${a.username ? ` of ${a.username}` : ''}? Its Google access is revoked and archiving stops. Emails already archived stay private to the user.`}
                        success={(r) => (r.disconnected === false ? `${a.email} was already disconnected.` : `${a.email} disconnected.`)} />
                    )}
                  </td>
                </tr>
              )) : <tr><td colSpan={10} className="muted">No mailboxes have been connected yet.</td></tr>}
            </tbody>
          </table></div></div>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  )
}
