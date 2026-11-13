import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminStatus, reindex, runMaintenance } from '../../api/admin'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'

const SCANNERS = { clamav: 'ClamAV', defender: 'Microsoft Defender', builtin: 'Built-in signatures only' }

/** admin/index.html → GET /api/v1/admin/status (fields it lacks: MIGRATION.md G16). */
export default function AdminIndex() {
  useTitle('Admin Console')
  const query = useQuery({ queryKey: ['admin-status'], queryFn: adminStatus })
  const s = query.data
  return (
    <>
      <div className="page-head"><div><h1>Admin Console</h1><p className="muted">Users, access control, policies and system status.</p></div></div>
      <AdminNav />
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        <div className="grid-2">
          <section className="card">
            <h2>Security status</h2>
            <dl className="meta">
              <dt>Encryption at rest</dt>
              <dd>{s.encryption.enabled
                ? <><span className="badge badge-ok">AES-256-GCM</span> active key <code>{s.encryption.key_id}</code></>
                : <><span className="badge badge-warn">Off</span> set DMS_ENCRYPTION_AT_REST=true</>}</dd>
              <dt>Encryption in transit</dt>
              <dd>{s.https_required
                ? <><span className="badge badge-ok">HTTPS enforced</span> (TLS 1.2+, HSTS)</>
                : <><span className="badge badge-warn">Not enforced</span> set DMS_FORCE_HTTPS=true and serve over TLS</>}
                {!s.secure_cookie && <><br /><small className="muted">Secure session cookies are off (SESSION_COOKIE_SECURE).</small></>}</dd>
              <dt>Malware scanning</dt>
              <dd><span className={`badge ${['clamav', 'defender'].includes(s.malware_scanner) ? 'badge-ok' : 'badge-warn'}`}>{SCANNERS[s.malware_scanner] || s.malware_scanner}</span>
                {s.malware_scanner === 'builtin' && <><br /><small className="muted">Configure CLAMAV_HOST (or install Microsoft Defender) for full antivirus scanning.</small></>}</dd>
              <dt>Directory / SSO</dt>
              <dd>{s.ldap_enabled && 'LDAP/AD · '}{s.saml_enabled && 'SAML 2.0 · '}Local accounts</dd>
            </dl>
          </section>
          <section className="card">
            <h2>At a glance</h2>
            <dl className="meta">
              <dt>Users</dt><dd><Link to="/admin/users">{s.users}</Link></dd>
              <dt>Devices awaiting approval</dt><dd><Link to="/admin/devices">{s.pending_devices}</Link></dd>
            </dl>
            <div className="actions">
              <ActionButton action={runMaintenance} label="Run maintenance now" icon="refresh" className="btn btn-secondary btn-sm"
                title="Purge expired recycle-bin items and apply version retention"
                success={(r) => `Maintenance complete: ${r.result.recycle_bin_purged} expired item(s) purged, ${r.result.versions_pruned} old version(s) removed.`} />
              <ActionButton action={reindex} label="Rebuild search index" icon="search" className="btn btn-ghost btn-sm"
                success={(r) => `Search index rebuilt for ${r.indexed} item(s).`} />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
