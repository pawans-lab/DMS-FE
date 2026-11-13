import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { recent } from '../api/documents'
import DocumentTable from '../components/DocumentTable'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import { useAllDocuments, useFolders, useTitle } from '../hooks/data'
import { dt } from '../lib/format'

/** recent.html: GET /recent (opened by you) and the 50 most recently modified documents. */
export default function Recent() {
  useTitle('Recent')
  const [params] = useSearchParams()
  const { byId } = useFolders()
  const viewed = useQuery({ queryKey: ['recent'], queryFn: recent })
  const docs = useAllDocuments()
  const latest = [...(docs.data || [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 50)
  const opened = (viewed.data || []).slice(0, 30)
  return (
    <>
      <div className="page-head">
        <div><h1>Recent</h1><p className="muted">Documents you opened recently, and the latest changes in the library.</p></div>
      </div>
      {opened.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Recently opened by you</h2></div>
          <ul className="list compact">
            {opened.map(({ document: d, viewed_at: at }) => (
              <li key={d.id}><Link to={`/documents/${d.id}`} className="list-row"><FileTypeBadge ext={d.extension} />
                <span className="list-main"><span className="truncate">{d.name}</span><small className="muted">{byId.get(d.folder_id)?.path || 'Root'}</small></span>
                <small className="muted nowrap">{dt(at, 'short')}</small></Link></li>
            ))}
          </ul>
        </section>
      )}
      <h2>Recently uploaded or modified</h2>
      {docs.isPending ? <Loading /> : latest.length ? (
        <div className="card card-flush"><DocumentTable documents={latest} highlightId={Number(params.get('highlight')) || 0} /></div>
      ) : (
        <div className="card">
          <EmptyState title="No recent documents" text="Uploaded and updated documents appear here." icon="clock" />
        </div>
      )}
    </>
  )
}
