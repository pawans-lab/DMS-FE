import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { contentUrl, recentVersions } from '../api/documents'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import Pagination from '../components/Pagination'
import { useAllDocuments, useTitle } from '../hooks/data'
import { dt, extensionOf, filesize, plural } from '../lib/format'

const PER_PAGE = 40

/**
 * versions.html. GET /versions returns at most 200 versions without a total (MIGRATION.md G9);
 * they are paged here, 40 per page as before.
 */
export default function Versions() {
  useTitle('Version History')
  const [params] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query = useQuery({ queryKey: ['versions'], queryFn: () => recentVersions(200) })
  const docs = useAllDocuments()
  const byDoc = new Map((docs.data || []).map((d) => [d.id, d]))
  const rows = query.data || []
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  return (
    <>
      <div className="page-head">
        <div><h1>Version History</h1><p className="muted">{plural(rows.length, 'stored version')} across all documents, newest first{rows.length >= 200 && ' (latest 200)'}.</p></div>
      </div>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : shown.length ? (
        <>
          <div className="card card-flush">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Document</th><th>Version</th><th className="num">Size</th><th className="hide-md">Note</th><th className="hide-sm">Created</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {shown.map((v) => {
                    const d = byDoc.get(v.document_id)
                    const isCurrent = d && d.version_number === v.number
                    return (
                      <tr key={`${v.document_id}-${v.number}`}>
                        <td><Link className="doc-name" to={`/documents/${v.document_id}#versions`}><FileTypeBadge ext={d?.extension || extensionOf(v.document_name)} /><span className="truncate">{v.document_name}</span></Link></td>
                        <td><span className={`badge${isCurrent ? ' badge-primary' : ''}`}>v{v.label}</span>{isCurrent && <> <small className="muted">current</small></>}</td>
                        <td className="num muted">{filesize(v.size)}</td>
                        <td className="hide-md muted">{v.note || (v.number === 1 ? 'Initial upload' : '')}{v.created_by && ` · ${v.created_by}`}</td>
                        <td className="hide-sm muted nowrap">{dt(v.created_at)}</td>
                        <td className="actions-col">
                          {(!d || d.permissions.includes('download')) && (
                            <a className="icon-btn" href={contentUrl(v.document_id, v.number)} title={`Download v${v.label}`} aria-label={`Download v${v.label}`}><Icon name="download" /></a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pages={pages} />
        </>
      ) : (
        <div className="card"><EmptyState title="No versions yet" text="Every upload and update creates a version that you can download or restore." icon="layers" /></div>
      )}
    </>
  )
}
