import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { folderHistory, getFolder } from '../../api/folders'
import Loading, { QueryError } from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'

const DocLink = ({ d, name }) => <Link to={`/documents/${d.document_id}`}>{name ?? d.document}</Link>

function describe(e) {
  const d = e.details || {}
  switch (e.action) {
    case 'created': return <>Folder created in <strong>{d.parent}</strong></>
    case 'renamed': return <>Renamed from <strong>{d.old_name}</strong> to <strong>{d.new_name}</strong></>
    case 'moved': return <>Moved from <strong>{d.old_location}</strong> to <strong>{d.new_location}</strong></>
    case 'subfolder_added': return <>Subfolder <strong>{d.folder}</strong> added{d.moved_from && ` (moved from ${d.moved_from})`}</>
    case 'subfolder_removed': return <>Subfolder <strong>{d.folder}</strong> {d.deleted ? 'deleted' : `moved to ${d.moved_to}`}</>
    case 'subfolder_renamed': return <>Subfolder <strong>{d.old_name}</strong> renamed to <strong>{d.new_name}</strong></>
    case 'document_added':
      return <>Document {d.document_id ? <DocLink d={d} /> : <strong>{d.document}</strong>} {d.moved_from ? `moved in from ${d.moved_from}` : 'uploaded'}</>
    case 'document_removed': return <>Document <DocLink d={d} /> moved to {d.moved_to}</>
    case 'document_updated':
      return <>Document <DocLink d={d} /> {d.restored_from ? `restored from v${d.restored_from} as v${d.version}` : `updated to v${d.version}`}</>
    case 'document_renamed': return <>Document <strong>{d.old_name}</strong> renamed to <DocLink d={d} name={d.new_name} /></>
    case 'document_trashed': return <>Document <DocLink d={d} /> moved to Trash</>
    case 'document_restored': return <>Document <DocLink d={d} /> restored from Trash</>
    case 'document_purged': return <>Document <strong>{d.document}</strong> permanently deleted</>
    default: {
      const text = e.action.replaceAll('_', ' ')
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }
  }
}

/** folders/history.html. */
export default function History() {
  const { id } = useParams()
  const folderId = Number(id)
  const folder = useQuery({ queryKey: ['folder', folderId], queryFn: () => getFolder(folderId) })
  const events = useQuery({ queryKey: ['folder-history', folderId], queryFn: () => folderHistory(folderId) })
  const f = folder.data?.folder
  useTitle(f ? `History · ${f.name}` : 'History')

  if (folder.isPending || events.isPending) return <Loading />
  if (folder.isError) return <QueryError error={folder.error} />
  if (events.isError) return <QueryError error={events.error} />
  const ancestors = folder.data.breadcrumbs.slice(0, -1)

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/folders">Folders</Link>
        {ancestors.map((c) => <span key={c.id} style={{ display: 'contents' }}><span>/</span><Link to={`/folders/${c.id}`}>{c.name}</Link></span>)}
        <span>/</span><Link to={`/folders/${f.id}`}>{f.name}</Link><span>/</span><span className="current">History</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>Folder history</h1>
          <p className="muted">Structural changes to <strong>{f.path}</strong>: renames, moves and changes to its contents.</p>
        </div>
        <div className="actions"><Link className="btn btn-ghost" to={`/folders/${f.id}`}>Back to folder</Link></div>
      </div>
      {events.data.length ? (
        <div className="card">
          <ul className="history">
            {events.data.map((e) => (
              <li key={e.id}>
                <span className="tl-dot tl-folder" />
                <div className="history-body">
                  <div>{describe(e)}</div>
                  {e.folder_name !== f.name && <small className="muted">Folder was named “{e.folder_name}” at the time</small>}
                </div>
                <small className="muted nowrap">{dt(e.created_at)}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : <div className="card"><EmptyState title="No history yet" icon="history" /></div>}
    </>
  )
}
