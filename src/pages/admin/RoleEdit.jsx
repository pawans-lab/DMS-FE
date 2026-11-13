import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createRole, deleteRole, listRoles, updateRole } from '../../api/admin'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useModals } from '../../components/modals/modalContext'
import { useTitle } from '../../hooks/data'
import { CAP_LABELS, PERMS, PERM_HELP, PERM_LABELS } from '../../lib/format'
import { toast } from '../../lib/toast'

function RoleForm({ role, caps }) {
  const navigate = useNavigate()
  const modals = useModals()
  const [form, setForm] = useState({
    name: role?.name || '', description: role?.description || '',
    // Capabilities the server no longer offers (such as the removed 'emails') are dropped on save.
    permissions: role?.permissions || [], capabilities: (role?.capabilities || []).filter((c) => caps.includes(c)),
  })
  const toggle = (key, value) => setForm({
    ...form, [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value],
  })
  // An empty list must still be sent so the server clears it (api.py only updates keys that are present).
  const body = () => ({ ...form, permissions: form.permissions.length ? form.permissions : [''], capabilities: form.capabilities.length ? form.capabilities : [''] })
  const save = useMutation({
    meta: { inline: true },
    mutationFn: () => (role ? updateRole(role.id, body()) : createRole(body())),
    onSuccess: (r) => { toast(`Role '${r.role.name}' saved.`, 'success'); navigate('/admin/roles') },
  })
  const remove = useMutation({
    meta: { inline: true },
    mutationFn: () => deleteRole(role.id),
    onSuccess: () => { toast(`Role '${role.name}' deleted.`, 'success'); navigate('/admin/roles') },
  })
  const error = save.error || remove.error

  return (
    <section className="card">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <div className="field"><label htmlFor="r-name">Name</label>
          <input type="text" id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required readOnly={role?.is_system} /></div>
        <div className="field"><label htmlFor="r-desc">Description</label>
          <input type="text" id="r-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <fieldset className="field"><label>Repository permissions (inherited by every folder unless a folder stops inheritance)</label>
          {PERMS.map((p) => (
            <label key={p} className="check"><input type="checkbox" checked={form.permissions.includes(p)} onChange={() => toggle('permissions', p)} /> {PERM_LABELS[p]} <small className="muted">{PERM_HELP[p]}</small></label>
          ))}
        </fieldset>
        <fieldset className="field"><label>System capabilities</label>
          {caps.map((c) => (
            <label key={c} className="check"><input type="checkbox" checked={form.capabilities.includes(c)} onChange={() => toggle('capabilities', c)} /> {CAP_LABELS[c] || c}</label>
          ))}
        </fieldset>
        {error && <p className="form-error" role="alert">{error.message}</p>}
        <div className="modal-actions">
          {role && !role.is_system && (
            <button type="button" className="btn btn-ghost btn-danger-text"
              onClick={async () => { if (await modals.confirm(`Delete the role “${role.name}”?`)) remove.mutate() }}>Delete role</button>
          )}
          <Link className="btn btn-ghost" to="/admin/roles">Cancel</Link>
          <button className="btn btn-primary" type="submit" disabled={save.isPending}>Save role</button>
        </div>
      </form>
    </section>
  )
}

/** admin/role_edit.html for /admin/roles/new and /admin/roles/:id. */
export default function RoleEdit() {
  const { id } = useParams()
  const roleId = id ? Number(id) : null
  const query = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  const role = roleId ? query.data?.roles.find((r) => r.id === roleId) : null
  useTitle(role ? role.name : 'New role')
  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  if (roleId && !role) return <QueryError error={{ message: 'Role not found.' }} />
  return (
    <>
      <div className="page-head"><div><h1>{role ? role.name : 'New custom role'}</h1></div></div>
      <AdminNav />
      <RoleForm key={role?.id || 'new'} role={role} caps={query.data.available_capabilities || []} />
    </>
  )
}
