import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { authOptions, register } from '../../api/auth'
import { DEVICE_CODES } from '../../api/client'
import { useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

/** auth/register.html → POST /api/v1/auth/register. */
export default function Register() {
  useTitle('Create account')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const options = useQuery({ queryKey: ['auth-options'], queryFn: authOptions })
  const [form, setForm] = useState({ display_name: '', email: '', username: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  if (options.data?.setup_required) return <Navigate to="/setup" replace />
  if (options.data && !options.data.signup_enabled) {
    toast('New accounts are created by an administrator. Contact your administrator for access.', 'error')
    return <Navigate to="/login" replace />
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await register(form)
      await queryClient.resetQueries({ queryKey: ['me'] })
      if (data.mfa_required) navigate('/mfa')
      else if (data.mfa_setup_required) navigate('/account/mfa')
      else navigate('/', { replace: true })
    } catch (err) {
      if (err.code === 'pending') navigate('/device-pending')
      else if (DEVICE_CODES.has(err.code)) navigate('/blocked')
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Create your account</h1>
      <p className="muted">You get your own private <strong>My Files</strong> space. Share files or folders with colleagues whenever you choose.</p>
      {error && <div className="notice notice-error" role="alert"><div>{error}</div></div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="display_name">Full name</label>
          <input type="text" id="display_name" value={form.display_name} onChange={set('display_name')} autoComplete="name" required autoFocus /></div>
        <div className="field"><label htmlFor="email">Work email</label>
          <input type="email" id="email" value={form.email} onChange={set('email')} autoComplete="email" required /></div>
        <div className="field"><label htmlFor="username">User name</label>
          <input type="text" id="username" value={form.username} onChange={set('username')} autoComplete="username" required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,59}" />
          <small className="muted">3–60 characters: letters, digits, dots, hyphens or underscores. You can sign in with this or your email.</small></div>
        <div className="field"><label htmlFor="password">Password</label>
          <input type="password" id="password" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={12} />
          <small className="muted">At least 12 characters, with three of: lower-case, upper-case, digits, symbols.</small></div>
        <div className="field"><label htmlFor="password2">Repeat password</label>
          <input type="password" id="password2" value={form.password2} onChange={set('password2')} autoComplete="new-password" required /></div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>Create account</button>
      </form>
      <p className="small muted auth-alt">Already have an account? <Link to="/login">Sign in</Link></p>
    </>
  )
}
