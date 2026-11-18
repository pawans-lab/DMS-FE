import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listUsers, reassignOwnership } from '../../api/admin'
import AdminNav from '../../components/AdminNav'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useModals } from '../../components/modals/modalContext'
import { useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

const userLabel = (u) => `${u.display_name || u.username} · ${u.username}${u.is_active ? '' : ' (inactive)'}`

function UserPicker({ id, label, users, value, onChange, exclude }) {
  return (
    <div className="field"><label htmlFor={id}>{label}</label>
      <select id={id} required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a user…</option>
        {users.filter((u) => String(u.id) !== String(exclude ?? '')).map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
      </select></div>
  )
}

/** "12, 15 40" → [12, 15, 40]; null when something is not a positive whole number. */
function parseIds(text) {
  const parts = text.split(/[\s,;]+/).filter(Boolean)
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p) || Number(p) < 1)) return null
  return [...new Set(parts.map(Number))]
}

const done = (r) => `${r.count} item${r.count === 1 ? '' : 's'} reassigned.`

/** Reassign the owner of chosen folders/documents (by id). */
function ReassignItems({ users }) {
  const [kind, setKind] = useState('document')
  const [ids, setIds] = useState('')
  const [toUser, setToUser] = useState('')
  const [error, setError] = useState('')
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: (items) => reassignOwnership({ toUserId: Number(toUser), items }),
    onSuccess: (r) => { toast(done(r), 'success'); setIds('') },
  })
  function submit(e) {
    e.preventDefault()
    const list = parseIds(ids)
    if (!list) { setError('Enter one or more item IDs (numbers), separated by commas or spaces.'); return }
    setError('')
    mutation.mutate(list.map((id) => ({ type: kind, id })))
  }
  return (
    <section className="card">
      <h2>Reassign selected items</h2>
      <p className="small muted">The ID of a folder or document is the number at the end of its address (for example /documents/42).</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="own-kind">Type</label>
          <select id="own-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="document">Documents</option>
            <option value="folder">Folders</option>
          </select></div>
        <div className="field"><label htmlFor="own-ids">IDs</label>
          <input type="text" id="own-ids" required value={ids} onChange={(e) => setIds(e.target.value)} placeholder="e.g. 42, 43" /></div>
        <UserPicker id="own-to" label="New owner" users={users} value={toUser} onChange={setToUser} />
        {(error || mutation.error) && <p className="form-error" role="alert">{error || mutation.error.message}</p>}
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}><Icon name="users" /> Reassign</button>
      </form>
    </section>
  )
}

/** Reassign everything one user owns (e.g. a leaver) to another user. */
function ReassignAll({ users, initialFrom }) {
  const modals = useModals()
  const [fromUser, setFromUser] = useState(initialFrom)
  const [toUser, setToUser] = useState('')
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => reassignOwnership({ toUserId: Number(toUser), fromUserId: Number(fromUser) }),
    onSuccess: (r) => toast(r.count ? done(r) : 'That user does not own any items.', 'success'),
  })
  const nameOf = (id) => users.find((u) => String(u.id) === String(id))?.username || 'this user'
  async function submit(e) {
    e.preventDefault()
    if (!(await modals.confirm(`Reassign every folder and document owned by ${nameOf(fromUser)} to ${nameOf(toUser)}?`))) return
    mutation.mutate()
  }
  return (
    <section className="card">
      <h2>Reassign everything a user owns</h2>
      <p className="small muted">Use this when someone leaves or changes role. Shares on the items are kept; the new owner can change them.</p>
      <form onSubmit={submit}>
        <UserPicker id="own-from" label="Current owner" users={users} value={fromUser} onChange={setFromUser} />
        <UserPicker id="own-to-all" label="New owner" users={users} value={toUser} onChange={setToUser} exclude={fromUser} />
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending || !fromUser || !toUser}><Icon name="users" /> Reassign all</button>
      </form>
    </section>
  )
}

/** Admin: ownership reassignment → POST /admin/ownership/reassign. */
export default function Ownership() {
  useTitle('Ownership')
  const [params] = useSearchParams()
  const query = useQuery({ queryKey: ['admin-users', ''], queryFn: () => listUsers('') })
  const users = query.data || []
  return (
    <>
      <div className="page-head">
        <div><h1>Ownership</h1>
          <p className="muted">Every folder and document has an owner who may rename, move, delete and share it. Reassign ownership here; every change is recorded in the audit log.</p></div>
      </div>
      <AdminNav />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <div className="grid-2">
          <ReassignItems users={users} />
          <ReassignAll users={users} initialFrom={params.get('from') || ''} />
        </div>
      )}
    </>
  )
}
