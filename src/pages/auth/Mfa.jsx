import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logout, verifyMfa } from '../../api/auth'
import { useTitle } from '../../hooks/data'
import { safeNext } from '../../lib/format'
import { toast } from '../../lib/toast'

/** auth/mfa.html → POST /api/v1/auth/mfa. */
export default function Mfa() {
  useTitle('Verification')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifyMfa(code.trim())
      await queryClient.resetQueries({ queryKey: ['me'] })
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      if (err.code === 'authentication_required') navigate('/login', { replace: true })
      else if (err.code === 'too_many_attempts') {
        toast(err.message, 'error')
        navigate('/login', { replace: true })
      } else setError(err.code === 'invalid_mfa_code'
        ? 'That code is not correct. Enter the current 6-digit code or a recovery code.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    try { await logout() } catch { /* ignore */ }
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <h1>Two-step verification</h1>
      <p className="muted">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
      {error && <div className="notice notice-error" role="alert"><div>{error}</div></div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="code">Verification code</label>
          <input type="text" id="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={20}
            value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>Verify</button>
      </form>
      <div className="center" style={{ marginTop: 12, display: 'flex' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel and sign out</button>
      </div>
    </>
  )
}
