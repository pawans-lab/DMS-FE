import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listRoles } from '../../api/admin'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { PERMS, PERM_LABELS } from '../../lib/format'

/** admin/roles.html → GET /api/v1/admin/roles. */
export default function Roles() {
  useTitle('Roles')
  const query = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  return (
    <>
      <div className="page-head">
        <div><h1>Roles</h1><p className="muted">Predefined roles plus your own custom roles. A role&apos;s repository permissions apply everywhere unless a folder stops inheriting them.</p></div>
        <div className="actions"><Link className="btn btn-primary" to="/admin/roles/new">New custom role</Link></div>
      </div>
      <AdminNav />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <div className="card card-flush"><div className="table-wrap"><table className="table">
          <thead><tr><th>Role</th>{PERMS.map((p) => <th key={p} className="hide-sm">{PERM_LABELS[p]}</th>)}<th>Capabilities</th><th className="num">Users</th></tr></thead>
          <tbody>
            {query.data.roles.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/admin/roles/${r.id}`}>{r.name}</Link>{r.is_system && <> <span className="badge">predefined</span></>}<br /><small className="muted">{r.description}</small></td>
                {PERMS.map((p) => <td key={p} className="hide-sm">{r.permissions.includes(p) ? '✓' : ''}</td>)}
                <td className="small">{r.capabilities.join(', ') || '—'}</td>
                <td className="num">{r.user_count}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </>
  )
}
