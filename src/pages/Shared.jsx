import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { shared } from '../api/documents'
import DocumentTable from '../components/DocumentTable'
import FavouriteButton from '../components/FavouriteButton'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import { useTitle } from '../hooks/data'
import { dt } from '../lib/format'

const LEVELS = { view: 'Can view', download: 'Can view & download', edit: 'Can edit', full: 'Full control' }

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
      <FolderCards rows={folders} subtitle={(r) => (r.shared_by ? `Shared by ${r.shared_by}` : 'Shared folder')} />
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
                  </td>
                  <td>
                    {r.shared_with.map((p) => (
                      <div key={p.id}>{p.name} <small className="muted">{LEVELS[p.level] || ''}</small></div>
                    ))}
                  </td>
                  <td className="hide-sm muted nowrap">{dt(r.shared_at, 'date')}</td>
                  <td className="actions-col">
                    <div className="row-actions">
                      {r.permissions.includes('share') && (
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

/** shared.html → GET /api/v1/shared. Two tabs: shared with me / shared by me, each with a count. */
export default function Shared() {
  const [params] = useSearchParams()
  const byMe = params.get('tab') === 'by-me'
  useTitle(byMe ? 'Shared by me' : 'Shared with me')
  const query = useQuery({ queryKey: ['shared'], queryFn: shared })
  const data = query.data || {}
  const items = data.items || []
  const mine = data.shared_by_me || []
  const counts = data.counts || {}
  const summary = countLine(byMe ? counts.shared_by_me : counts.shared_with_me)
  return (
    <>
      <div className="page-head"><div>
        <h1>{byMe ? 'Shared by me' : 'Shared with me'}</h1>
        <p className="muted">
          {byMe ? 'Folders and files you have shared with other people.' : 'Folders and files other people have shared with you.'}
          {summary && <> You have {byMe ? 'shared' : 'received'} {summary}.</>}
        </p>
      </div></div>
      <nav className="tabs" aria-label="Shared items">
        <Link to="/shared" className={byMe ? '' : 'active'}>Shared with me ({counts.shared_with_me?.total ?? 0})</Link>
        <Link to="/shared?tab=by-me" className={byMe ? 'active' : ''}>Shared by me ({counts.shared_by_me?.total ?? 0})</Link>
      </nav>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} />
        : byMe ? <SharedByMe rows={mine} /> : <SharedWithMe items={items} />}
    </>
  )
}
