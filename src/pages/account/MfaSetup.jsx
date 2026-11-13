import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { mfaEnable, mfaSetup } from '../../api/auth'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { toast } from '../../lib/toast'

/** account/mfa.html → GET/POST /api/v1/auth/mfa/setup. The QR code is drawn here from provisioning_uri. */
export default function MfaSetup() {
  useTitle('Multi-factor authentication')
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const setup = useQuery({ queryKey: ['mfa-setup'], queryFn: mfaSetup, retry: false, enabled: !recoveryCodes })
  const uri = setup.data?.provisioning_uri

  useEffect(() => {
    if (!uri) return
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(setQr, () => setQr(''))
  }, [uri])

  const enable = useMutation({
    mutationFn: () => mfaEnable(code.trim()),
    meta: { inline: true },
    onSuccess: async (r) => {
      setRecoveryCodes(r.recovery_codes)
      toast('Multi-factor authentication is on. Save your recovery codes now.', 'success')
      await queryClient.resetQueries({ queryKey: ['me'] })
    },
  })

  let content
  if (recoveryCodes) {
    content = (
      <section className="card">
        <h2>Your recovery codes</h2>
        <p className="muted">Each code can be used once if you lose access to your authenticator app. Store them somewhere safe — they are not shown again.</p>
        <pre className="preview-text">{recoveryCodes.join('\n')}</pre>
        <Link className="btn btn-primary" to="/">Done</Link>
      </section>
    )
  } else if (setup.isPending) content = <Loading />
  else if (setup.isError && setup.error.code === 'conflict') {
    content = (
      <section className="card"><p><Icon name="shield" /> Multi-factor authentication is already on for your account.</p>
        <Link className="btn btn-ghost" to="/account">Back to my account</Link></section>
    )
  } else if (setup.isError) content = <QueryError error={setup.error} />
  else {
    content = (
      <section className="card">
        <h2>1. Scan this code with your authenticator app</h2>
        {qr && <img src={qr} alt="QR code for your authenticator app" width="200" height="200" />}
        <p className="small muted">Can&apos;t scan? Enter this key manually: <code className="break">{setup.data.secret}</code></p>
        <h2>2. Enter the 6-digit code it shows</h2>
        <form className="filters" onSubmit={(e) => { e.preventDefault(); enable.mutate() }}>
          <div className="field grow"><label htmlFor="code">Code</label>
            <input type="text" id="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="field field-actions"><button className="btn btn-primary" type="submit" disabled={enable.isPending}>Turn on MFA</button></div>
        </form>
        {enable.error && <p className="form-error" role="alert">That code is not correct. Check the time on your phone and try again.</p>}
      </section>
    )
  }

  return (
    <>
      <div className="page-head"><div><h1>Multi-factor authentication</h1></div></div>
      {content}
    </>
  )
}
