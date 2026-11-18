import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { directory } from '../../api/documents'
import { emailShares, shareEmail, unshareEmail } from '../../api/emails'
import { useAuth } from '../../auth/authContext'
import ActionButton from '../../components/ActionButton'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { dt, initial } from '../../lib/format'
import { toast } from '../../lib/toast'

const DEFAULT_LEVELS = [{ key: 'view', label: 'Can view' }, { key: 'download', label: 'Can view & download' }]

/**
 * Owner-only sharing of one archived email (Permissions Matrix 5): View or Download, with a DMS user.
 * Administrators never get access to an email unless it is shared with them.
 */
export default function EmailShares({ emailId }) {
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['email-shares', emailId], queryFn: () => emailShares(emailId) })
  const dir = useQuery({ queryKey: ['directory', ''], queryFn: () => directory('') })
  const [person, setPerson] = useState('')
  const [level, setLevel] = useState('view')
  const [expires, setExpires] = useState('')
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => shareEmail(emailId, Number(person), level, expires),
    onSuccess: () => {
      const who = dir.data?.users.find((u) => u.id === Number(person))
      toast(`Email shared with ${who?.label || 'the user'}.`, 'success')
      setPerson('')
      setExpires('')
    },
  })

  const levels = query.data?.levels?.length ? query.data.levels : DEFAULT_LEVELS
  const levelLabel = (key) => levels.find((l) => l.key === key)?.label || key
  const shares = query.data?.shares || []
  const users = (dir.data?.users || []).filter((u) => u.id !== user.id)

  return (
    <section className="card" id="sharing">
      <h2>Sharing</h2>
      <p className="small muted">Only you can see this email unless you share it. People you share it with can read it{' '}
        (Can view) or also download the .eml and attachments (Can view &amp; download). They cannot share it further.</p>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : (
        shares.length ? (
          <ul className="people-list">
            {shares.map((s) => (
              <li key={s.id}>
                <span className="avatar">{s.principal_type === 'role' ? <Icon name="users" /> : initial(s.principal)}</span>
                <span className="list-main"><strong>{s.principal}</strong><br />
                  <small className="muted">
                    {levelLabel(s.level)}
                    {s.expires_at && ` · until ${dt(s.expires_at, 'date')}`}
                    {s.expired && ' (expired)'}
                  </small></span>
                <ActionButton action={() => unshareEmail(emailId, s.id)} label="Remove" className="btn btn-ghost btn-xs btn-danger-text"
                  confirm={`Stop sharing this email with ${s.principal}?`} success="Access removed." />
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Not shared with anyone.</p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (person) mutation.mutate() }}>
        <div className="field"><label htmlFor="email-share-person">Person</label>
          <select id="email-share-person" required value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Choose a person…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.username}</option>)}
          </select></div>
        <div className="field"><label htmlFor="email-share-level">Access</label>
          <select id="email-share-level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {levels.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select></div>
        <div className="field"><label htmlFor="email-share-expires">Access until (optional)</label>
          <input type="date" id="email-share-expires" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <button className="btn btn-secondary btn-sm" type="submit" disabled={mutation.isPending || !person}><Icon name="share" /> Share</button>
      </form>
    </section>
  )
}
