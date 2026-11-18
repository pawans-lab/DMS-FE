import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { emptyRecycleBin, purgeDocument, recycleBin, restoreDocument } from '../api/documents'
import { purgeFolder, restoreFolder } from '../api/folders'
import ActionButton from '../components/ActionButton'
import Icon from '../components/Icon'
import LegalHoldBadge from '../components/LegalHoldBadge'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import { useFolders, useTitle } from '../hooks/data'
import { dt } from '../lib/format'
import { parentPath } from '../lib/folders'

/** Message after emptying the bin (DELETE /recycle-bin): purged count plus items kept because of a legal hold. */
function emptiedMessage(r) {
  const n = (r.purged_folders || 0) + (r.purged_documents || 0)
  const held = r.kept_on_hold || 0
  const purged = n ? `Recycle bin emptied: ${n} item${n === 1 ? '' : 's'} permanently deleted.` : 'Nothing was deleted.'
  return held ? `${purged} ${held} item${held === 1 ? ' is' : 's are'} under a legal hold and ${held === 1 ? 'was' : 'were'} kept.` : purged
}

/**
 * Actions on one deleted row. Restore: owner or Admin, within the retention window (`can_restore`).
 * Delete forever: Admin only (`can_purge`), never while under a legal hold.
 */
function RowActions({ item, restore, purge, restored, purgeConfirm, purged }) {
  const canRestore = item.can_restore ?? true
  const canPurge = !!item.can_purge && !item.legal_hold
  if (!canRestore && !canPurge) return <span className="small muted">—</span>
  return (
    <div className="row-actions">
      {canRestore && <ActionButton action={restore} label="Restore" icon="restore" success={restored} />}
      {canPurge && (
        <ActionButton action={purge} label="Delete forever" className="btn btn-ghost btn-sm btn-danger-text"
          confirm={purgeConfirm} success={purged} />
      )}
    </div>
  )
}

/** recycle_bin.html → GET/DELETE /api/v1/recycle-bin, restore and purge per item. */
export default function RecycleBin() {
  useTitle('Recycle Bin')
  const { byId } = useFolders()
  const query = useQuery({ queryKey: ['recycle-bin'], queryFn: recycleBin })
  const folders = query.data?.folders || []
  const documents = query.data?.documents || []
  const count = folders.length + documents.length
  const canPurge = !!query.data?.can_purge
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recycle Bin</h1>
          <p className="muted">
            Deleted items stay here for a limited time (30 days by default) so you can restore them. After that they are deleted permanently.
            {canPurge ? ' As an administrator you can also delete them permanently at any time.' : ' Only an administrator can delete items permanently before then.'}
          </p>
        </div>
        {count > 0 && canPurge && (
          <div className="actions">
            <ActionButton action={emptyRecycleBin} label="Empty recycle bin" icon="trash" className="btn btn-danger"
              confirm={`Permanently delete all ${count} item(s) in the recycle bin, including every version? Items under a legal hold are kept. This cannot be undone.`}
              success={emptiedMessage} />
          </div>
        )}
      </div>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : count ? (
        <div className="card card-flush">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th className="hide-md">Original location</th><th className="hide-md">Owner</th><th>Deleted</th><th className="hide-sm">Deleted permanently on</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={`f${f.id}`}>
                    <td><span className="doc-name"><Icon name="folder" /><span className="truncate">{f.name}</span></span> <LegalHoldBadge item={f} /></td>
                    <td className="hide-md muted">{parentPath(f.path)}</td>
                    <td className="hide-md muted">{f.is_owner ? 'You' : f.owner || '—'}</td>
                    <td className="muted nowrap">{dt(f.deleted_at)}</td>
                    <td className="hide-sm muted nowrap">{dt(f.expires_at, 'date')}</td>
                    <td className="actions-col">
                      <RowActions item={f} restore={() => restoreFolder(f.id)} restored={`Folder '${f.name}' restored.`}
                        purge={() => purgeFolder(f.id)}
                        purgeConfirm={`Permanently delete the folder “${f.name}” and everything that was in it, including all versions? This cannot be undone.`}
                        purged={`Folder '${f.name}' permanently deleted.`} />
                    </td>
                  </tr>
                ))}
                {documents.map((d) => (
                  <tr key={`d${d.id}`}>
                    <td><span className="doc-name"><FileTypeBadge ext={d.extension} /><span className="truncate">{d.name}</span></span> <LegalHoldBadge item={d} /></td>
                    <td className="hide-md muted">{d.folder_id ? <Link to={`/folders/${d.folder_id}`} className="muted-link">{byId.get(d.folder_id)?.path || 'Folder'}</Link> : 'Root'}</td>
                    <td className="hide-md muted">{d.is_owner ? 'You' : d.owner || '—'}</td>
                    <td className="muted nowrap">{dt(d.deleted_at)}</td>
                    <td className="hide-sm muted nowrap">{dt(d.expires_at, 'date')}</td>
                    <td className="actions-col">
                      <RowActions item={d} restore={() => restoreDocument(d.id)} restored={`'${d.name}' restored.`}
                        purge={() => purgeDocument(d.id)}
                        purgeConfirm={`Permanently delete “${d.name}” and all its versions? This cannot be undone.`}
                        purged={`'${d.name}' permanently deleted.`} />
                    </td>
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
