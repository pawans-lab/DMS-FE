import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { validityDocuments } from '../api/validity'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import Loading, { QueryError } from '../components/Loading'
import ValidityBadge from '../components/validity/ValidityBadge'
import { useFolders, useTitle } from '../hooks/data'

const FILTERS = [
  ['all', 'All'], ['expired', 'Expired'], ['expires_today', 'Expires today'], ['expiring', 'Expiring soon'],
  ['accepted', 'Accepted after expiry'], ['requires_confirmation', 'To confirm'], ['needs_review', 'Needs review'],
  ['pending', 'Awaiting analysis'], ['failed', 'Analysis failed'], ['valid', 'Valid'], ['no_expiry', 'No expiry'],
  ['paused', 'Paused'], ['disabled', 'Monitoring off'],
]

/** Validity dashboard: monitored documents the user may see, by expiry status. */
export default function Validity() {
  useTitle('Document validity')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const q = params.get('q') || ''
  const [text, setText] = useState(q)
  const [limit, setLimit] = useState(100)
  const { byId } = useFolders()
  const query = useQuery({
    queryKey: ['validity-documents', status, q, limit],
    queryFn: () => validityDocuments({ status, q, limit }),
    placeholderData: keepPreviousData,
  })
  const counts = query.data?.counts || {}
  const link = (value) => `?${new URLSearchParams({ ...(value !== 'all' ? { status: value } : {}), ...(q ? { q } : {}) })}`

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Document validity</h1>
          <p className="muted">Expiry status of documents in monitored folders that you can access.
            {query.data && ` Business date: ${query.data.today}.`}</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Validity status">
        {FILTERS.filter(([value]) => value === 'all' || value === status || counts[value]).map(([value, label]) => (
          <Link key={value} to={link(value)} className={value === status ? 'active' : undefined}>
            {label}{counts[value] != null && ` (${counts[value]})`}
          </Link>
        ))}
      </nav>
      <form className="filters" onSubmit={(e) => {
        e.preventDefault()
        const next = new URLSearchParams(params)
        if (text.trim()) next.set('q', text.trim()); else next.delete('q')
        setParams(next)
      }}>
        <div className="field grow"><label htmlFor="vq">Search</label>
          <input type="text" id="vq" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, type, number or vessel" /></div>
        <div className="field field-actions"><button type="submit" className="btn btn-secondary">Search</button></div>
      </form>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : query.data.documents.length ? (
        <div className="card card-flush">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Document</th><th>Type</th><th>Vessel</th><th>Expiry date</th><th>Status</th></tr></thead>
              <tbody>
                {query.data.documents.map((d) => (
                  <tr key={d.id}>
                    <td><Link to={`/documents/${d.id}#validity`} className="list-row">
                      <FileTypeBadge ext={d.extension} />
                      <span className="list-main"><span className="truncate">{d.name}</span>
                        <small className="muted truncate">{byId.get(d.folder_id)?.path || ''}{d.document_number && ` · ${d.document_number}`}</small></span>
                    </Link></td>
                    <td>{d.document_type || '—'}</td>
                    <td>{d.vessel_name || '—'}</td>
                    <td className="nowrap">{d.has_expiry === false ? 'None' : d.expiry_date || '—'}</td>
                    <td><ValidityBadge summary={d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.next_offset != null && (
            <div className="pad"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setLimit(limit + 100)}>Show more</button></div>
          )}
        </div>
      ) : (
        <div className="card">
          <EmptyState title="No documents" icon="calendar"
            text="Enable Document Validity Monitoring on a folder (New folder, or the folder's More menu) and upload documents into it." />
        </div>
      )}
    </>
  )
}
