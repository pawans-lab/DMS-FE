import { Link } from 'react-router-dom'
import DocumentTable from '../components/DocumentTable'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import { useFavourites, useTitle } from '../hooks/data'

/** favourites.html → GET /api/v1/favourites. */
export default function Favourites() {
  useTitle('Favourites')
  const query = useFavourites()
  const items = query.data || []
  const folders = items.filter((i) => i.type === 'folder').map((i) => i.item)
  const documents = items.filter((i) => i.type === 'document').map((i) => i.item)
  return (
    <>
      <div className="page-head"><div><h1>Favourites</h1><p className="muted">Folders and documents you starred.</p></div></div>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <>
          {folders.length > 0 && (
            <section className="folder-cards">
              {folders.map((f) => (
                <div className="folder-card" key={f.id}>
                  <Link className="folder-card-link" to={`/folders/${f.id}`}>
                    <span className="stat-icon si-amber"><Icon name="folder" /></span>
                    <span className="list-main"><span className="truncate">{f.name}</span><small className="muted">{f.path}</small></span>
                  </Link>
                </div>
              ))}
            </section>
          )}
          {documents.length > 0 && <div className="card card-flush"><DocumentTable documents={documents} /></div>}
          {!folders.length && !documents.length && (
            <div className="card"><EmptyState title="No favourites yet" text="Use the star next to a folder or document name to add it here." icon="star" /></div>
          )}
        </>
      )}
    </>
  )
}
