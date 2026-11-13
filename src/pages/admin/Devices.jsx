import { useQuery } from '@tanstack/react-query'
import { deviceAction, getSettings, listDevices } from '../../api/admin'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'

const ACTIONS = [['approved', 'Approve'], ['blocked', 'Block'], ['remove', 'Remove']]
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

/** admin/devices.html → GET/PATCH /api/v1/admin/devices. */
export default function Devices() {
  useTitle('Devices')
  const query = useQuery({ queryKey: ['admin-devices'], queryFn: listDevices })
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getSettings })
  const s = settings.data
  return (
    <>
      <div className="page-head"><div><h1>Devices</h1>
        {s && <p className="muted">New devices are {s.device_policy === 'any' ? 'allowed automatically' : 'held for approval'}{s.blocked_platforms.length > 0 && `; blocked platforms: ${s.blocked_platforms.join(', ')}`}. Change the policy in Settings.</p>}
      </div></div>
      <AdminNav />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <div className="card card-flush"><div className="table-wrap"><table className="table">
          <thead><tr><th>User</th><th>Device</th><th>Status</th><th className="hide-md">Last seen</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {query.data.length ? query.data.map((d) => (
              <tr key={d.id}>
                <td>{d.username}</td>
                <td>{capitalize(d.platform)}<br /><small className="muted">first seen {dt(d.first_seen, 'date')}</small></td>
                <td><span className={`badge ${d.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>{d.status}</span></td>
                <td className="hide-md muted nowrap">{dt(d.last_seen)}</td>
                <td className="actions-col"><div className="row-actions">
                  {ACTIONS.filter(([action]) => d.status !== action).map(([action, label]) => (
                    <ActionButton key={action} action={() => deviceAction(d.id, action)} label={label} className="btn btn-ghost btn-xs" success="Device updated." />
                  ))}
                </div></td>
              </tr>
            )) : <tr><td colSpan={5} className="muted">No devices recorded yet.</td></tr>}
          </tbody>
        </table></div></div>
      )}
    </>
  )
}
