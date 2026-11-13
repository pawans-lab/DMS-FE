import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authOptions, login } from '../../api/auth'
import { DEVICE_CODES, backendUrl } from '../../api/client'
import { APP_NAME, useAuth } from '../../auth/authContext'
import ParticleBackground from '../../components/ParticleBackground'
import { useTitle } from '../../hooks/data'
import { safeNext } from '../../lib/format'
import '../../styles/login.css'

const REMEMBER_KEY = 'dms.rememberedUser'

function readRemembered() {
  try { return localStorage.getItem(REMEMBER_KEY) || '' } catch { return '' }
}

/** auth/login.html → POST /api/v1/auth/login. Full-page themed sign-in (own layout, not AuthLayout). */
export default function Login() {
  useTitle('Sign in')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { status } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [username, setUsername] = useState(readRemembered)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => readRemembered() !== '')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const options = useQuery({ queryKey: ['auth-options'], queryFn: authOptions })

  useEffect(() => {
    document.body.classList.add('login-body')
    return () => document.body.classList.remove('login-body')
  }, [])

  if (options.data?.setup_required) return <Navigate to="/setup" replace />
  if (status === 'ok') return <Navigate to={next} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const data = await login(username.trim(), password)
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, username.trim())
        else localStorage.removeItem(REMEMBER_KEY)
      } catch { /* storage unavailable */ }
      await queryClient.resetQueries({ queryKey: ['me'] })
      if (data.mfa_required) navigate(`/mfa?next=${encodeURIComponent(next)}`)
      else if (data.mfa_setup_required) navigate('/account/mfa')
      else navigate(next, { replace: true })
    } catch (err) {
      if (err.code === 'pending') navigate('/device-pending')
      else if (DEVICE_CODES.has(err.code)) navigate('/blocked')
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function forgot(e) {
    e.preventDefault()
    setError('')
    setInfo('Please contact your administrator to reset your password.')
  }

  const sso = options.data?.sso || []
  return (
    <>
      <ParticleBackground />
      <div className="lx-ambient" aria-hidden="true" />
      <div className="lx-ambient two" aria-hidden="true" />

      <main className="lx-page">
        <section className="lx-wrap" aria-label={`${APP_NAME} sign in`}>
          <div className="lx-brand" aria-label="JMBAXi DMS">
            <div className="lx-brand-logo">
              <img src="/jmbaxi-logo-light.png" alt="JMBAXi logo" />
            </div>
            <div className="lx-brand-name">DMS</div>
          </div>

          <div className="lx-card">
            <h1>Welcome back</h1>
            <p className="lx-subtitle">Sign in to securely access your documents.</p>

            {error && <div className="lx-error" role="alert">{error}</div>}

            <form onSubmit={submit}>
              <div className="lx-field">
                <label htmlFor="username">Username or email</label>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email" autoComplete="username" required autoFocus />
              </div>
              <div className="lx-field">
                <label htmlFor="password">Password</label>
                <div className="lx-input-wrap">
                  <input className="lx-password" type={showPassword ? 'text' : 'password'} id="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                    autoComplete="current-password" required />
                  <button type="button" className="lx-toggle" onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.6" />
                      {showPassword && <path d="M4 4l16 16" />}
                    </svg>
                  </button>
                </div>
              </div>
              {options.data?.ldap_label && <p className="lx-hint">You can sign in with your {options.data.ldap_label} account.</p>}
              <div className="lx-options">
                <label className="lx-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <a href="#" onClick={forgot}>Forgot password?</a>
              </div>
              <button type="submit" className="lx-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
              <p className="lx-status" role="status">{info}</p>
            </form>

            {sso.length > 0 && (
              <>
                <div className="lx-divider"><span>or</span></div>
                <div className="lx-sso">
                  {/* Full-page redirects handled by Flask (routes/auth.py). */}
                  {sso.map((p) => (
                    <a key={p.name} className="lx-sso-btn" href={backendUrl(p.login_url)}>Continue with {p.label}</a>
                  ))}
                </div>
              </>
            )}
            {options.data?.signup_enabled && (
              <p className="lx-signup">New here? <Link to="/register">Create an account</Link></p>
            )}
          </div>
          <div className="lx-footer">Secure document access · {APP_NAME}</div>
        </section>
      </main>
    </>
  )
}
