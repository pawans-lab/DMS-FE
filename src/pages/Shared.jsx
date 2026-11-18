import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { shared } from '../api/documents'
import { sharedEmails } from '../api/emails'
import DocumentTable from '../components/DocumentTable'
import FavouriteButton from '../components/FavouriteButton'
import Icon from '../components/Icon'
import LegalHoldBadge from '../components/LegalHoldBadge'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import { useTitle } from '../hooks/data'
import { dt, filesize, initial, shareLevelLabel } from '../lib/format'
import { canDo } from '../lib/perms'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function countLine(c) {
  if (!c || !c.total) return null
  const parts = []
  if (c.documents) parts.push(plural(c.documents, 'file'))
  if (c.folders) parts.push(plural(c.folders, 'folder'))
  return parts.join(' and ')
}

function FolderCards({ rows, subtitle }) {
  if (!rows.length) return null
  return (
    <section className="folder-cards">
      {rows.map((row) => (
        <div className="folder-card" key={row.id}>
          <Link className="folder-card-link" to={`/folders/${row.id}`}>
            <span className="stat-icon si-amber"><Icon name="folder" /></span>
            <span className="list-main"><span className="truncate">{row.item.name}</span>
              <small className="muted">{subtitle(row)}</small></span>
          </Link>
          <LegalHoldBadge item={row.item} />
          <FavouriteButton kind="folder" id={row.id} />
        </div>
      ))}
    </section>
  )
}

function SharedWithMe({ items }) {
  const folders = items.filter((i) => i.type === 'folder')
  const documents = items.filter((i) => i.type === 'document').map((i) => i.item)
  if (!items.length) {
    return <div className="card"><EmptyState title="Nothing shared with you yet" text="When someone shares a folder or file with you, it appears here." icon="share" /></div>
  }
  return (
    <>
      <FolderCards rows={folders} subtitle={(r) => [r.shared_by ? `Shared by ${r.shared_by}` : 'Shared folder',
        r.item.owner && r.item.owner !== r.shared_by ? `owner ${r.item.owner}` : null].filter(Boolean).join(' · ')} />
      {documents.length > 0 && <div className="card card-flush"><DocumentTable documents={documents} /></div>}
    </>
  )
}

function SharedByMe({ rows }) {
  if (!rows.length) {
    return <div className="card"><EmptyState title="You haven't shared anything yet" text="Folders and files you share with other people appear here." icon="share" /></div>
  }
  return (
    <div className="card card-flush">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Shared with</th><th className="hide-sm">Shared on</th>
              <th className="actions-col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isFolder = r.type === 'folder'
              return (
                <tr key={`${r.type}-${r.id}`}>
                  <td>
                    <Link className="doc-name" to={isFolder ? `/folders/${r.id}` : `/documents/${r.id}`}>
                      {isFolder ? <Icon name="folder" /> : <FileTypeBadge ext={r.item.extension} />}
                      <span className="truncate">{r.item.name}</span>
                    </Link>
                    <LegalHoldBadge item={r.item} />
                  </td>
                  <td>
                    {r.shared_with.map((p) => (
                      <div key={p.id}>{p.name} <small className="muted">{p.level ? shareLevelLabel(p.level) : ''}</small></div>
                    ))}
                  </td>
                  <td className="hide-sm muted nowrap">{dt(r.shared_at, 'date')}</td>
                  <td className="actions-col">
                    <div className="row-actions">
                      {canDo(r.item, 'item.share') && (
                        <Link className="icon-btn" to={`/permissions/${r.type}/${r.id}`} title="Manage sharing" aria-label="Manage sharing"><Icon name="share" /></Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Archived emails other users shared with me (GET /emails/shared). Opening one is read-only for me. */
function SharedEmails() {
  const query = useQuery({ queryKey: ['emails', 'shared'], queryFn: sharedEmails })
  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  const emails = query.data.emails || []
  if (!emails.length) {
    return <div className="card"><EmptyState title="No emails shared with you" text="When someone shares an archived email with you, it appears here." icon="mail" /></div>
  }
  return (
    <div className="card card-flush">
      <ul className="mail-list">
        {emails.map((e) => (
          <li key={e.id}>
            <Link to={`/emails/${e.id}`} className="mail-row">
              <span className="avatar">{initial(e.sender)}</span>
              <span className="mail-main">
                <span className="mail-top"><span className="mail-from truncate">{e.sender || 'Unknown sender'}</span><small className="muted nowrap">{dt(e.received_at)}</small></span>
                <span className="mail-subject truncate">{e.subject || '(no subject)'}</span>
                <span className="mail-snippet muted truncate">{e.owner ? `Shared by ${e.owner}` : e.snippet}</span>
              </span>
              <span className="mail-meta">
                <span className="badge">{(e.access || []).includes('download') ? 'View & download' : 'View only'}</span>
                {e.attachment_count > 0 && <span className="badge"><Icon name="paperclip" /> {e.attachment_count}</span>}
                <small className="muted">{filesize(e.size)}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** shared.html → GET /api/v1/shared. Two tabs: shared with me / shared by me, each with a count. */
export default function Shared() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  const byMe = tab === 'by-me'
  const emailsTab = tab === 'emails'
  useTitle(byMe ? 'Shared by me' : emailsTab ? 'Emails shared with me' : 'Shared with me')
  const query = useQuery({ queryKey: ['shared'], queryFn: shared })
  const data = query.data || {}
  const items = data.items || []
  const mine = data.shared_by_me || []
  const counts = data.counts || {}
  const summary = emailsTab ? null : countLine(byMe ? counts.shared_by_me : counts.shared_with_me)
  const emailCount = useQuery({ queryKey: ['emails', 'shared'], queryFn: sharedEmails, meta: { silent: true } }).data?.emails?.length
  return (
    <>
      <div className="page-head"><div>
        <h1>{byMe ? 'Shared by me' : emailsTab ? 'Emails shared with me' : 'Shared with me'}</h1>
        <p className="muted">
          {byMe ? 'Folders and files you have shared with other people.'
            : emailsTab ? 'Archived emails other people have shared with you.' : 'Folders and files other people have shared with you.'}
          {summary && <> You have {byMe ? 'shared' : 'received'} {summary}.</>}
        </p>
      </div></div>
      <nav className="tabs" aria-label="Shared items">
        <Link to="/shared" className={byMe || emailsTab ? '' : 'active'}>Shared with me ({counts.shared_with_me?.total ?? 0})</Link>
        <Link to="/shared?tab=by-me" className={byMe ? 'active' : ''}>Shared by me ({counts.shared_by_me?.total ?? 0})</Link>
        <Link to="/shared?tab=emails" className={emailsTab ? 'active' : ''}>Emails shared with me ({emailCount ?? 0})</Link>
      </nav>
      {emailsTab ? <SharedEmails />
        : query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} />
          : byMe ? <SharedByMe rows={mine} /> : <SharedWithMe items={items} />}
    </>
  )
}
