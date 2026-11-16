import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getSettings, listRoles, saveSettings } from '../../api/admin'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

const PLATFORMS = ['windows', 'macos', 'linux', 'android', 'ios', 'other'] // services/settings.py PLATFORMS
const pairs = (obj) => Object.entries(obj || {}).map(([k, v]) => `${k} = ${v}`).join('\n')

/** Settings as form text, the way admin/settings.html shows them. */
function toForm(s) {
  return {
    ...s,
    allowed_extensions: (s.allowed_extensions || []).join(', '),
    blocked_extensions: (s.blocked_extensions || []).join(', '),
    type_size_limits: pairs(s.type_size_limits),
    group_role_map: pairs(s.group_role_map),
    ip_allowlist: (s.ip_allowlist || []).join('\n'),
  }
}

/** The keys of the form. Text values are sent as text; api.py _settings_form passes them to the same parser as the old form. */
const KEYS = [
  'allowed_extensions', 'blocked_extensions', 'max_upload_mb', 'type_size_limits', 'recycle_bin_days', 'folder_name_pattern',
  'document_name_pattern', 'name_max_length', 'tags_controlled', 'require_version_comment', 'version_keep_last',
  'version_keep_years', 'self_signup', 'signup_default_role', 'mfa_required', 'session_idle_minutes', 'session_max_hours',
  'lockout_threshold', 'lockout_minutes', 'sso_auto_provision', 'sso_default_role', 'group_role_map', 'ip_allowlist',
  'device_policy', 'blocked_platforms',
]

function SettingsForm({ settings, roles }) {
  const [s, setS] = useState(() => toForm(settings))
  const text = (key) => ({ value: s[key] ?? '', onChange: (e) => setS({ ...s, [key]: e.target.value }) })
  const check = (key) => ({ checked: !!s[key], onChange: (e) => setS({ ...s, [key]: e.target.checked }) })
  const togglePlatform = (p) => setS({
    ...s, blocked_platforms: s.blocked_platforms.includes(p) ? s.blocked_platforms.filter((x) => x !== p) : [...s.blocked_platforms, p],
  })
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => saveSettings(Object.fromEntries(KEYS.map((k) => [k, typeof s[k] === 'number' ? String(s[k]) : s[k]]))),
    onSuccess: (r) => { toast('Settings saved.', 'success'); setS(toForm(r.settings)) },
  })
  const signupRoles = roles.filter((r) => !r.capabilities.includes('admin') && !r.capabilities.includes('records'))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="grid-2">
        <section className="card">
          <h2>File types &amp; size limits</h2>
          <div className="field"><label htmlFor="s-allowed">Allowed file types</label>
            <textarea id="s-allowed" rows={5} {...text('allowed_extensions')} />
            <small className="muted">Extensions without the dot. Recognised types get a content check.</small></div>
          <div className="field"><label htmlFor="s-blocked">Blocked file types (always rejected)</label>
            <textarea id="s-blocked" rows={3} {...text('blocked_extensions')} /></div>
          <div className="field"><label htmlFor="s-max">Maximum file size (MB)</label>
            <input type="text" id="s-max" inputMode="numeric" {...text('max_upload_mb')} />
            <small className="muted">The server maximum is DMS_MAX_REQUEST_MB.</small></div>
          <div className="field"><label htmlFor="s-limits">Per-type size limits (MB)</label>
            <textarea id="s-limits" rows={3} placeholder="mp4 = 500" {...text('type_size_limits')} /></div>
        </section>

        <section className="card">
          <h2>Repository</h2>
          <div className="field"><label htmlFor="s-bin">Recycle bin retention (days)</label>
            <input type="text" id="s-bin" inputMode="numeric" {...text('recycle_bin_days')} />
            <small className="muted">Deleted folders and documents can be restored for this long (at least 30 days), then they are permanently deleted. Users can also empty their recycle bin at any time.</small></div>
          <div className="field"><label htmlFor="s-fpat">Folder naming convention (regular expression, optional)</label>
            <input type="text" id="s-fpat" placeholder="e.g. [A-Z0-9][A-Za-z0-9 _-]*" {...text('folder_name_pattern')} /></div>
          <div className="field"><label htmlFor="s-dpat">Document naming convention (regular expression on the name without extension, optional)</label>
            <input type="text" id="s-dpat" {...text('document_name_pattern')} /></div>
          <div className="field"><label htmlFor="s-len">Maximum name length</label>
            <input type="text" id="s-len" inputMode="numeric" {...text('name_max_length')} /></div>
          <label className="check"><input type="checkbox" {...check('tags_controlled')} /> Controlled tags: only tags approved under Metadata &amp; tags may be used</label>
        </section>

        <section className="card">
          <h2>Versions</h2>
          <div className="field"><label htmlFor="s-comment">Change comments</label>
            <select id="s-comment" {...text('require_version_comment')}>
              <option value="none">Optional</option><option value="major">Required for major versions</option><option value="all">Required for every new version</option>
            </select></div>
          <div className="field"><label htmlFor="s-keep">Keep the last N versions (0 = all)</label>
            <input type="text" id="s-keep" inputMode="numeric" {...text('version_keep_last')} /></div>
          <div className="field"><label htmlFor="s-years">Keep versions for X years (0 = forever)</label>
            <input type="text" id="s-years" inputMode="numeric" {...text('version_keep_years')} />
            <small className="muted">A version is kept while it is among the last N <em>or</em> younger than X years. The current version is never removed. Folders can override these rules.</small></div>
        </section>

        <section className="card">
          <h2>Sign-in &amp; sessions</h2>
          <label className="check"><input type="checkbox" {...check('self_signup')} /> Let people create their own account from the sign-in page</label>
          <div className="field"><label htmlFor="s-signup-role">Role for self-created accounts</label>
            <select id="s-signup-role" {...text('signup_default_role')}>{signupRoles.map((r) => <option key={r.id}>{r.name}</option>)}</select>
            <small className="muted">Every user also gets a private My Files folder. Contributors can also see and add to the shared library.</small></div>
          <label className="check"><input type="checkbox" {...check('mfa_required')} /> Require multi-factor authentication for local and LDAP accounts</label>
          <div className="field"><label htmlFor="s-idle">Session idle timeout (minutes)</label><input type="text" id="s-idle" inputMode="numeric" {...text('session_idle_minutes')} /></div>
          <div className="field"><label htmlFor="s-max-h">Maximum session length (hours)</label><input type="text" id="s-max-h" inputMode="numeric" {...text('session_max_hours')} /></div>
          <div className="field"><label htmlFor="s-lock">Lock account after N failed sign-ins</label><input type="text" id="s-lock" inputMode="numeric" {...text('lockout_threshold')} /></div>
          <div className="field"><label htmlFor="s-lockm">Lockout duration (minutes)</label><input type="text" id="s-lockm" inputMode="numeric" {...text('lockout_minutes')} /></div>
          <label className="check"><input type="checkbox" {...check('sso_auto_provision')} /> Create accounts automatically on first SSO / LDAP sign-in</label>
          <div className="field"><label htmlFor="s-role">Default role for new SSO / LDAP users</label>
            <select id="s-role" {...text('sso_default_role')}>{roles.map((r) => <option key={r.id}>{r.name}</option>)}</select></div>
          <div className="field"><label htmlFor="s-groups">Directory group → role mapping</label>
            <textarea id="s-groups" rows={3} placeholder="JMBVault-Admins = Admin" {...text('group_role_map')} />
            <small className="muted">Groups from LDAP (memberOf), OIDC (groups claim) or SAML (groups attribute). Mapped roles replace the user&apos;s roles at each sign-in.</small></div>
        </section>

        <section className="card">
          <h2>Network &amp; device access</h2>
          <div className="field"><label htmlFor="s-ip">Allowed IP addresses / ranges</label>
            <textarea id="s-ip" rows={3} placeholder={'10.0.0.0/8\n203.0.113.17'} {...text('ip_allowlist')} />
            <small className="muted">Empty = any address. The server itself (localhost) is always allowed. Recovery: <code>flask --app app reset-security-policy</code>.</small></div>
          <div className="field"><label htmlFor="s-dev">New devices</label>
            <select id="s-dev" {...text('device_policy')}>
              <option value="any">Allowed automatically</option><option value="approval">Need administrator approval</option>
            </select></div>
          <fieldset className="field"><label>Blocked platforms</label>
            {PLATFORMS.map((p) => (
              <label key={p} className="check"><input type="checkbox" checked={s.blocked_platforms.includes(p)} onChange={() => togglePlatform(p)} /> {p.charAt(0).toUpperCase() + p.slice(1)}</label>
            ))}
          </fieldset>
        </section>
      </div>
      {mutation.error && <p className="form-error" role="alert" style={{ marginTop: 16 }}>{mutation.error.message}</p>}
      <div className="modal-actions"><button className="btn btn-primary" type="submit" disabled={mutation.isPending}>Save settings</button></div>
    </form>
  )
}

/** admin/settings.html → GET/PATCH /api/v1/admin/settings. */
export default function Settings() {
  useTitle('Settings')
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getSettings })
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p className="muted">Policies applied across the repository. Changes take effect immediately.</p></div></div>
      <AdminNav />
      {settings.isPending || roles.isPending ? <Loading />
        : settings.isError ? <QueryError error={settings.error} />
          : roles.isError ? <QueryError error={roles.error} />
            : <SettingsForm key={settings.dataUpdatedAt} settings={settings.data} roles={roles.data.roles} />}
    </>
  )
}
