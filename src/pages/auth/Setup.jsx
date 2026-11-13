import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { authOptions, setup } from '../../api/auth'
import { getCsrf } from '../../api/client'
import { useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

/** auth/setup.html → POST /api/v1/auth/setup (first administrator; only while no user exists). */
export default function Setup() {
  useTitle('Set up')
  const navigate = useNavigate()
  const options = useQuery({ queryKey: ['auth-options'], queryFn: authOptions })
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  if (options.data && !options.data.setup_required) return <Navigate to="/login" replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await getCsrf()
      await setup(form)
      toast('Administrator account created. Sign in to continue.', 'success')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Create the administrator account</h1>
      <p className="muted">No users exist yet. This account will have full administrative access. Other people can then create their own account from the sign-in page, be added in the Admin Console, or sign in through your organisation&apos;s directory or single sign-on.</p>
      {error && <div className="notice notice-error" role="alert"><div>{error}</div></div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="username">User name</label>
          <input type="text" id="username" value={form.username} onChange={set('username')} required autoFocus /></div>
        <div className="field"><label htmlFor="display_name">Full name</label>
          <input type="text" id="display_name" value={form.display_name} onChange={set('display_name')} /></div>
        <div className="field"><label htmlFor="email">Email</label>
          <input type="text" id="email" value={form.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="password">Password</label>
          <input type="password" id="password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
          <small className="muted">At least 12 characters, with three of: lower-case, upper-case, digits, symbols.</small></div>
        <div className="field"><label htmlFor="password2">Repeat password</label>
          <input type="password" id="password2" value={form.password2} onChange={set('password2')} autoComplete="new-password" required /></div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>Create administrator</button>
      </form>
    </>
  )
}
