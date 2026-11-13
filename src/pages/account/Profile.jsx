import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { changePassword, createToken, disableMfa, getAccount, removeDevice, revokeToken } from '../../api/account'
import ActionButton from '../../components/ActionButton'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'
import { toast } from '../../lib/toast'

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

function PasswordForm() {
  const [form, setForm] = useState({ current: '', new: '', new2: '' })
  const mutation = useMutation({
    mutationFn: () => changePassword(form),
    meta: { inline: true },
    onSuccess: () => { toast('Password changed.', 'success'); setForm({ current: '', new: '', new2: '' }) },
  })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  return (
    <section className="card">
      <h2>Change password</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="field"><label htmlFor="pw-cur">Current password</label>
          <input type="password" id="pw-cur" autoComplete="current-password" required value={form.current} onChange={set('current')} /></div>
        <div className="field"><label htmlFor="pw-new">New password</label>
          <input type="password" id="pw-new" autoComplete="new-password" required value={form.new} onChange={set('new')} />
          <small className="muted">At least 12 characters, with three of: lower-case, upper-case, digits, symbols.</small></div>
        <div className="field"><label htmlFor="pw-new2">Repeat new password</label>
          <input type="password" id="pw-new2" autoComplete="new-password" required value={form.new2} onChange={set('new2')} /></div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <button className="btn btn-secondary" type="submit" disabled={mutation.isPending}>Change password</button>
      </form>
      <p className="small muted">Accounts that sign in through LDAP or single sign-on change their password with their organisation.</p>
    </section>
  )
}

/** account/profile.html → GET /api/v1/account. */
export default function Profile() {
  useTitle('My account')
  const query = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const [code, setCode] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [tokenDays, setTokenDays] = useState('365')
  const [newToken, setNewToken] = useState(null)
  const mfaOff = useMutation({
    mutationFn: () => disableMfa(code),
    onSuccess: () => { toast('Multi-factor authentication turned off.', 'success'); setCode('') },
  })
  const tokenMutation = useMutation({
    mutationFn: () => createToken(tokenName, tokenDays),
    onSuccess: (r) => { setNewToken(r.token); setTokenName('') },
  })

  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  const { user, api_tokens: tokens, devices } = query.data
  const label = user.display_name || user.username

  return (
    <>
      <div className="page-head">
        <div><h1>My account</h1><p className="muted">{label} · {user.username}{user.email && ` · ${user.email}`}</p></div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Profile</h2>
          <dl className="meta">
            <dt>User name</dt><dd>{user.username}</dd>
            <dt>Email</dt><dd>{user.email || '—'}</dd>
            <dt>Roles</dt><dd>{user.roles.join(', ') || 'None'}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Multi-factor authentication</h2>
          {user.mfa_enabled ? (
            <>
              <p><span className="badge badge-ok"><Icon name="shield" /> On</span> Sign-in requires a code from your authenticator app.</p>
              <form className="filters" onSubmit={(e) => { e.preventDefault(); mfaOff.mutate() }}>
                <div className="field grow"><label htmlFor="mfa-off">Current code</label>
                  <input type="text" id="mfa-off" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} /></div>
                <div className="field field-actions"><button className="btn btn-ghost btn-danger-text" type="submit" disabled={mfaOff.isPending}>Turn off</button></div>
              </form>
            </>
          ) : (
            <>
              <p className="muted">Protect your account with a time-based code from an authenticator app (Microsoft Authenticator, Google Authenticator, …).</p>
              <Link className="btn btn-primary" to="/account/mfa"><Icon name="shield" /> Set up MFA</Link>
            </>
          )}
        </section>

        <PasswordForm />

        <section className="card" id="tokens">
          <h2>API tokens</h2>
          <p className="small muted">For the desktop sync client, the mobile app and integrations (<code>Authorization: Bearer &lt;token&gt;</code>, API at <code>/api/v1</code>). A token acts with your permissions.</p>
          {newToken && (
            <div className="notice notice-info"><div><strong>Copy this token now — it will not be shown again:</strong><br /><code className="break">{newToken}</code></div></div>
          )}
          {tokens.length > 0 && (
            <ul className="list compact">
              {tokens.map((t) => (
                <li key={t.id} className="list-row"><span className="list-main"><span>{t.name} <code>{t.prefix}…</code></span>
                  <small className="muted">Created {dt(t.created_at)} · last used {dt(t.last_used_at)}{t.expires_at && ` · expires ${dt(t.expires_at, 'date')}`}</small></span>
                  <ActionButton action={() => revokeToken(t.id)} label="Revoke" className="btn btn-ghost btn-xs btn-danger-text"
                    confirm={`Revoke the token “${t.name}”? Clients using it stop working.`} success="Token revoked." />
                </li>
              ))}
            </ul>
          )}
          <form className="filters" onSubmit={(e) => { e.preventDefault(); tokenMutation.mutate() }}>
            <div className="field grow"><label htmlFor="tok-name">Name</label>
              <input type="text" id="tok-name" placeholder="Laptop sync client" required maxLength={100} value={tokenName} onChange={(e) => setTokenName(e.target.value)} /></div>
            <div className="field"><label htmlFor="tok-days">Expires in (days)</label>
              <input type="text" id="tok-days" inputMode="numeric" value={tokenDays} onChange={(e) => setTokenDays(e.target.value)} /></div>
            <div className="field field-actions"><button className="btn btn-secondary" type="submit" disabled={tokenMutation.isPending}>Create token</button></div>
          </form>
        </section>

        <section className="card" id="devices">
          <h2>My devices</h2>
          <ul className="list compact">
            {devices.length ? devices.map((d) => (
              <li key={d.id} className="list-row"><span className="list-main">
                <span>{capitalize(d.platform)} <span className={`badge ${d.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>{d.status}</span></span>
                <small className="muted truncate">First seen {dt(d.first_seen)} · last seen {dt(d.last_seen)}</small></span>
                <ActionButton action={() => removeDevice(d.id)} label="Remove" className="btn btn-ghost btn-xs"
                  success="Device removed. It will need to sign in again." />
              </li>
            )) : <li className="muted">No devices recorded.</li>}
          </ul>
        </section>
      </div>
    </>
  )
}
