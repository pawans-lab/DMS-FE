import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createUser, getUser, listRoles, updateUser } from '../../api/admin'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'
import { toast } from '../../lib/toast'

const SOURCES = [
  ['local', 'Local account (password)'], ['ldap', 'Active Directory / LDAP'],
  ['oidc', 'Single sign-on (OpenID Connect)'], ['saml', 'Single sign-on (SAML)'],
]
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

function UserForm({ user, roles }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: user?.username || '', display_name: user?.display_name || '', email: user?.email || '',
    auth_source: user?.auth_source || 'local', password: '', is_active: user ? user.is_active : true,
    roles: (user?.roles || []).map((r) => r.id),
  })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const toggleRole = (rid) => setForm({ ...form, roles: form.roles.includes(rid) ? form.roles.filter((r) => r !== rid) : [...form.roles, rid] })
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => {
      // An empty list would leave the roles unchanged (api.py keeps "roles" when absent), so send [''].
      const body = { ...form, roles: form.roles.length ? form.roles : [''] }
      if (!user) { delete body.is_active; return createUser(body) }
      delete body.username
      return updateUser(user.id, { action: 'save', ...body })
    },
    onSuccess: (r) => {
      toast(user ? `User '${r.user.username}' saved.` : `User '${r.user.username}' created.`, 'success')
      navigate('/admin/users')
    },
  })
  return (
    <section className="card">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="field"><label htmlFor="u-name">User name</label>
          <input type="text" id="u-name" value={form.username} onChange={set('username')} disabled={!!user} required={!user} /></div>
        <div className="field"><label htmlFor="u-display">Full name</label><input type="text" id="u-display" value={form.display_name} onChange={set('display_name')} /></div>
        <div className="field"><label htmlFor="u-email">Email</label><input type="text" id="u-email" value={form.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="u-source">Sign-in method</label>
          <select id="u-source" value={form.auth_source} onChange={set('auth_source')}>
            {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <small className="muted">Pre-create SSO/LDAP users with their email to control their roles before they first sign in.</small></div>
        <div className="field"><label htmlFor="u-pass">{user ? 'New password (leave empty to keep)' : 'Password'}</label>
          <input type="password" id="u-pass" autoComplete="new-password" value={form.password} onChange={set('password')} />
          <small className="muted">Local accounts only. At least 12 characters, with three of: lower-case, upper-case, digits, symbols.</small></div>
        <fieldset className="field"><label>Roles</label>
          {roles.map((r) => (
            <label key={r.id} className="check"><input type="checkbox" checked={form.roles.includes(r.id)} onChange={() => toggleRole(r.id)} /> {r.name} <small className="muted">{r.description}</small></label>
          ))}
        </fieldset>
        {user && (
          <>
            <label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Account active</label>
            {user.is_active && !form.is_active && (
              <p className="small muted">Deactivating signs the user out everywhere, revokes their API tokens and removes everything shared with them. Items they own keep their owner; <Link to={`/admin/ownership?from=${user.id}`}>reassign their items</Link> if someone else should take them over.</p>
            )}
          </>
        )}
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <Link className="btn btn-ghost" to="/admin/users">Cancel</Link>
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>Save</button>
        </div>
      </form>
    </section>
  )
}

/** admin/user_edit.html for /admin/users/new and /admin/users/:id. */
export default function UserEdit() {
  const { id } = useParams()
  const userId = id ? Number(id) : null
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  const query = useQuery({ queryKey: ['admin-user', userId], queryFn: () => getUser(userId), enabled: !!userId })
  const user = query.data?.user
  useTitle(userId ? (user ? user.display_name || user.username : 'User') : 'New user')

  if (roles.isPending || (userId && query.isPending)) return <Loading />
  if (roles.isError) return <QueryError error={roles.error} />
  if (query.isError) return <QueryError error={query.error} />

  return (
    <>
      <div className="page-head"><div><h1>{user ? user.display_name || user.username : 'New user'}</h1></div></div>
      <AdminNav />
      <div className="grid-2">
        <UserForm key={user?.id || 'new'} user={user} roles={roles.data.roles} />
        {user && (
          <section className="card">
            <h2>Security</h2>
            <dl className="meta">
              <dt>MFA</dt><dd>{user.mfa_enabled ? 'Enabled' : 'Not enrolled'}</dd>
              <dt>Last sign-in</dt><dd>{dt(user.last_login_at)}</dd>
            </dl>
            <div className="actions">
              <ActionButton action={() => updateUser(user.id, { action: 'reset_mfa' })} label="Reset MFA" disabled={!user.mfa_enabled}
                success="Multi-factor authentication reset. The user can enrol again." />
              <ActionButton action={() => updateUser(user.id, { action: 'unlock' })} label="Unlock account" success="Account unlocked." />
            </div>
            <h2>Devices</h2>
            <ul className="list compact">
              {query.data.devices.length ? query.data.devices.map((d) => (
                <li key={d.id} className="list-row"><span className="list-main">
                  <span>{capitalize(d.platform)} <span className={`badge ${d.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>{d.status}</span></span>
                  <small className="muted truncate">last seen {dt(d.last_seen)}</small></span></li>
              )) : <li className="muted">No devices.</li>}
            </ul>
            <Link className="link-sm" to="/admin/devices">Manage devices</Link>
            <h2>Ownership</h2>
            <p className="small muted">Hand over every folder and document this user owns to another user (for example when they leave).</p>
            <Link className="btn btn-secondary btn-sm" to={`/admin/ownership?from=${user.id}`}><Icon name="users" /> Reassign their items</Link>
          </section>
        )}
      </div>
    </>
  )
}
