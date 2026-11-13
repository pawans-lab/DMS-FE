import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { emptyRecycleBin, purgeDocument, recycleBin, restoreDocument } from '../api/documents'
import { purgeFolder, restoreFolder } from '../api/folders'
import ActionButton from '../components/ActionButton'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import { useFolders, useTitle } from '../hooks/data'
import { dt } from '../lib/format'
import { parentPath } from '../lib/folders'

/** recycle_bin.html → GET/DELETE /api/v1/recycle-bin, restore and purge per item. */
export default function RecycleBin() {
  useTitle('Recycle Bin')
  const { byId } = useFolders()
  const query = useQuery({ queryKey: ['recycle-bin'], queryFn: recycleBin })
  const folders = query.data?.folders || []
  const documents = query.data?.documents || []
  const count = folders.length + documents.length
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recycle Bin</h1>
          <p className="muted">Deleted items stay here for a limited time (30 days by default) so you can restore them. After that they are deleted permanently. You can also delete them yourself at any time.</p>
        </div>
        {count > 0 && (
          <div className="actions">
            <ActionButton action={emptyRecycleBin} label="Empty recycle bin" icon="trash" className="btn btn-danger"
              confirm={`Permanently delete all ${count} item(s) in your recycle bin, including every version? This cannot be undone.`}
              success={(r) => {
                const n = r.purged_folders + r.purged_documents
                return n ? `Recycle bin emptied: ${n} item${n === 1 ? '' : 's'} permanently deleted.` : 'The recycle bin is already empty.'
              }} />
          </div>
        )}
      </div>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : count ? (
        <div className="card card-flush">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th className="hide-md">Original location</th><th>Deleted</th><th className="hide-sm">Deleted permanently on</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={`f${f.id}`}>
                    <td><span className="doc-name"><Icon name="folder" /><span className="truncate">{f.name}</span></span></td>
                    <td className="hide-md muted">{parentPath(f.path)}</td>
                    <td className="muted nowrap">{dt(f.deleted_at)}</td>
                    <td className="hide-sm muted nowrap">{dt(f.expires_at, 'date')}</td>
                    <td className="actions-col"><div className="row-actions">
                      <ActionButton action={() => restoreFolder(f.id)} label="Restore" icon="restore" success={`Folder '${f.name}' restored.`} />
                      <ActionButton action={() => purgeFolder(f.id)} label="Delete forever" className="btn btn-ghost btn-sm btn-danger-text"
                        confirm={`Permanently delete the folder “${f.name}” and everything that was in it, including all versions? This cannot be undone.`}
                        success={`Folder '${f.name}' permanently deleted.`} />
                    </div></td>
                  </tr>
                ))}
                {documents.map((d) => (
                  <tr key={`d${d.id}`}>
                    <td><span className="doc-name"><FileTypeBadge ext={d.extension} /><span className="truncate">{d.name}</span></span></td>
                    <td className="hide-md muted">{d.folder_id ? <Link to={`/folders/${d.folder_id}`} className="muted-link">{byId.get(d.folder_id)?.path || 'Folder'}</Link> : 'Root'}</td>
                    <td className="muted nowrap">{dt(d.deleted_at)}</td>
                    <td className="hide-sm muted nowrap">{dt(d.expires_at, 'date')}</td>
                    <td className="actions-col"><div className="row-actions">
                      <ActionButton action={() => restoreDocument(d.id)} label="Restore" icon="restore" success={`'${d.name}' restored.`} />
                      <ActionButton action={() => purgeDocument(d.id)} label="Delete forever" className="btn btn-ghost btn-sm btn-danger-text"
                        confirm={`Permanently delete “${d.name}” and all its versions? This cannot be undone.`}
                        success={`'${d.name}' permanently deleted.`} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card"><EmptyState title="The recycle bin is empty" text="Folders and documents you delete appear here and can be restored." icon="trash" /></div>
      )}
    </>
  )
}
