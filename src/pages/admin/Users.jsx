import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { listUsers } from '../../api/admin'
import AdminNav from '../../components/AdminNav'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { dt, plural } from '../../lib/format'

/** admin/users.html → GET /api/v1/admin/users?q=. */
export default function Users() {
  useTitle('Users')
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const [text, setText] = useState(q)
  const query = useQuery({ queryKey: ['admin-users', q], queryFn: () => listUsers(q) })
  const users = query.data || []
  return (
    <>
      <div className="page-head">
        <div><h1>Users</h1><p className="muted">{plural(users.length, 'user')}</p></div>
        <div className="actions"><Link className="btn btn-primary" to="/admin/users/new"><Icon name="users" /> Add user</Link></div>
      </div>
      <AdminNav />
      <form className="filters card" onSubmit={(e) => { e.preventDefault(); setParams(text ? { q: text } : {}) }}>
        <div className="field grow"><label htmlFor="uq">Find</label>
          <input type="search" id="uq" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, user name or email" /></div>
        <div className="field field-actions"><button className="btn btn-secondary" type="submit">Search</button></div>
      </form>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <div className="card card-flush"><div className="table-wrap"><table className="table">
          <thead><tr><th>User</th><th className="hide-md">Email</th><th>Roles</th><th className="hide-sm">Sign-in</th><th className="hide-sm">MFA</th><th>Status</th><th className="hide-md">Last sign-in</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><Link to={`/admin/users/${u.id}`}>{u.display_name || u.username}</Link><br /><small className="muted">{u.username}</small></td>
                <td className="hide-md muted">{u.email || ''}</td>
                <td>{u.roles.map((r) => r.name).join(', ') || '—'}</td>
                <td className="hide-sm muted">{u.auth_source}</td>
                <td className="hide-sm">{u.mfa_enabled ? 'On' : '—'}</td>
                <td>{u.is_active ? <span className="badge badge-ok">Active</span> : <span className="badge badge-warn">Disabled</span>}</td>
                <td className="hide-md muted nowrap">{dt(u.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </>
  )
}
