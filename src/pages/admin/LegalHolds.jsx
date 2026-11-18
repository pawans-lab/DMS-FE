import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { legalHolds, setLegalHold } from '../../api/admin'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useFolders, useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

/** Place a hold on a folder or document by its id (the id is shown in its URL). */
function PlaceHold() {
  const [kind, setKind] = useState('document')
  const [itemId, setItemId] = useState('')
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => setLegalHold(kind, Number(itemId), true, reason.trim()),
    onSuccess: () => {
      toast(`Legal hold placed on ${kind} #${itemId}.`, 'success')
      setItemId('')
      setReason('')
    },
  })
  return (
    <section className="card">
      <h2>Place a legal hold</h2>
      <p className="small muted">A held item (and, for a folder, everything in it) cannot be deleted, permanently deleted or moved by anyone until the hold is released. You can also place a hold from the item&apos;s own page (More → Place legal hold).</p>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="field"><label htmlFor="lh-kind">Type</label>
          <select id="lh-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="document">Document</option>
            <option value="folder">Folder</option>
          </select></div>
        <div className="field"><label htmlFor="lh-id">ID</label>
          <input type="text" id="lh-id" inputMode="numeric" pattern="[0-9]+" required value={itemId}
            onChange={(e) => setItemId(e.target.value.trim())} placeholder="e.g. 42" /></div>
        <div className="field grow"><label htmlFor="lh-reason">Reason (optional)</label>
          <input type="text" id="lh-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Case or matter reference" /></div>
        <div className="field field-actions">
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending || !itemId}><Icon name="shield" /> Place hold</button>
        </div>
      </form>
      {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
    </section>
  )
}

/** Admin: every folder and document under a legal hold → GET /admin/legal-holds, PUT /admin/legal-hold/<kind>/<id>. */
export default function LegalHolds() {
  useTitle('Legal holds')
  const { byId } = useFolders()
  const query = useQuery({ queryKey: ['admin-legal-holds'], queryFn: legalHolds })
  const folders = query.data?.folders || []
  const documents = query.data?.documents || []
  const release = (kind, item) => (
    <ActionButton action={() => setLegalHold(kind, item.id, false)} label="Release" icon="unlock"
      confirm={`Release the legal hold on “${item.name}”? It can then be deleted, purged or moved again.`}
      success={`Legal hold on '${item.name}' released.`} />
  )

  return (
    <>
      <div className="page-head">
        <div><h1>Legal holds</h1>
          <p className="muted">Items under a legal hold are preserved: nobody, administrators included, can delete, permanently delete or move them. Placing and releasing holds is recorded in the audit log.</p></div>
      </div>
      <AdminNav />
      <PlaceHold />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <section className="card card-flush">
          <div className="card-head pad"><h2>Current holds</h2><span className="small muted">{folders.length + documents.length} item(s)</span></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Item</th><th>Type</th><th className="hide-md">Location</th><th className="hide-sm">Owner</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {folders.map((f) => (
                <tr key={`f${f.id}`}>
                  <td><Link className="doc-name" to={`/folders/${f.id}`}><Icon name="folder" /><span className="truncate">{f.name}</span></Link> <small className="muted">#{f.id}</small></td>
                  <td>Folder</td>
                  <td className="hide-md muted">{f.path}</td>
                  <td className="hide-sm muted">{f.owner || '—'}</td>
                  <td className="actions-col">{release('folder', f)}</td>
                </tr>
              ))}
              {documents.map((d) => (
                <tr key={`d${d.id}`}>
                  <td><Link className="doc-name" to={`/documents/${d.id}`}><Icon name="file" /><span className="truncate">{d.name}</span></Link> <small className="muted">#{d.id}</small></td>
                  <td>Document</td>
                  <td className="hide-md muted">{d.folder_id ? byId.get(d.folder_id)?.path || `Folder #${d.folder_id}` : 'Root'}</td>
                  <td className="hide-sm muted">{d.owner || '—'}</td>
                  <td className="actions-col">{release('document', d)}</td>
                </tr>
              ))}
              {!folders.length && !documents.length && <tr><td colSpan={5} className="muted">No items are under a legal hold.</td></tr>}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  )
}
