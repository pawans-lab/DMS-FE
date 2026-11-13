import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { listEmails } from '../../api/emails'
import { gmailRetry, gmailStatus } from '../../api/gmail'
import ActionButton from '../../components/ActionButton'
import GmailConnectButton from '../../components/GmailConnectButton'
import GmailSyncButton from '../../components/GmailSyncButton'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import EmailStateBadge from '../../components/EmailStateBadge'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import { useTitle } from '../../hooks/data'
import { EMAIL_STATE_LABELS, dt, every, filesize, initial } from '../../lib/format'

const PAGE_SIZE = 25
const SORTS = ['imported', 'received', 'subject', 'sender']

/** The user's own archived emails → GET /api/v1/emails, GET /api/v1/gmail/status. */
export default function EmailsIndex() {
  useTitle('Email Archive')
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim().slice(0, 200)
  const state = EMAIL_STATE_LABELS[params.get('state')] ? params.get('state') : ''
  const hasAtt = params.get('attachments') === '1'
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : 'imported'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [form, setForm] = useState({ q, state, sort, attachments: hasAtt })
  const query = useQuery({
    queryKey: ['emails', { q, state, hasAtt, sort, page }],
    queryFn: () => listEmails({ q, state, attachments: hasAtt ? '1' : '', sort, page, per_page: PAGE_SIZE }),
  })
  const status = useQuery({ queryKey: ['gmail-status'], queryFn: gmailStatus, meta: { silent: true } })
  const s = status.data
  const configured = !!s?.configured && s.status !== 'not_configured'
  const connected = configured && !!s.connected
  const reauth = s?.status === 'reauth_required'
  const emails = query.data?.emails || []
  const pages = Math.max(1, Math.ceil((query.data?.total || 0) / PAGE_SIZE))

  function submit(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    if (form.q.trim()) next.set('q', form.q.trim())
    if (form.state) next.set('state', form.state)
    next.set('sort', form.sort)
    if (form.attachments) next.set('attachments', '1')
    setParams(next)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Email Archive</h1>
          <p className="muted">
            {connected ? (
              <>Emails you archive in <strong>{s.account}</strong> are saved here automatically within about {every(s.interval_seconds)}.{' '}
                <span className="nowrap">Last sync {s.last_sync_at ? dt(s.last_sync_at) : 'pending'}.</span></>
            ) : 'Your archived Gmail messages. Only you can see them.'}
          </p>
        </div>
        <div className="actions">
          {connected && !reauth && <GmailSyncButton disabled={s.sync_in_progress} />}
          <Link className="btn btn-ghost" to="/gmail"><Icon name="link" /> Gmail connection</Link>
        </div>
      </div>

      {s && reauth ? (
        <div className="notice notice-error" role="alert">
          <Icon name="alert" /><div><strong>Reconnect needed.</strong> Google access to {s.account || 'your mailbox'} expired, so archiving is paused.{s.error && <> {s.error}</>}</div>
          <GmailConnectButton label="Reconnect Gmail" className="btn btn-sm btn-primary" />
        </div>
      ) : s && !connected && (
        <div className="notice notice-info">
          <Icon name="mail" /><div>{configured ? 'Gmail is not connected. New archived emails are not being imported.' : 'Gmail archiving is not set up on the server. Contact the administrator.'}</div>
          {configured && <Link className="btn btn-sm btn-secondary" to="/gmail">Gmail connection</Link>}
        </div>
      )}

      {s && (s.pending > 0 || s.failed > 0) && (
        <div className={`notice ${s.failed ? 'notice-error' : 'notice-info'}`}>
          <Icon name={s.failed ? 'alert' : 'clock'} />
          <div>
            {s.pending > 0 && <div>{s.pending} archived email(s) waiting to be imported.</div>}
            {s.failed > 0 && <div>{s.failed} email(s) could not be imported after several attempts.</div>}
          </div>
          {s.failed > 0 && (
            <ActionButton action={gmailRetry} label="Retry failed" icon="refresh" className="btn btn-sm btn-secondary"
              success={(r) => `${r.queued} failed import(s) queued for retry.`} />
          )}
        </div>
      )}

      <form className="filters card" onSubmit={submit}>
        <div className="field grow">
          <label htmlFor="e-q">Search</label>
          <input type="search" id="e-q" maxLength={200} value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Subject, sender, recipient or text" />
        </div>
        <div className="field">
          <label htmlFor="e-state">Gmail status</label>
          <select id="e-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
            <option value="">Any</option>
            {Object.entries(EMAIL_STATE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-sort">Sort by</label>
          <select id="e-sort" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })}>
            <option value="imported">Date archived</option><option value="received">Date received</option>
            <option value="subject">Subject</option><option value="sender">Sender</option>
          </select>
        </div>
        <label className="check"><input type="checkbox" checked={form.attachments} onChange={(e) => setForm({ ...form, attachments: e.target.checked })} /> With attachments</label>
        <div className="field field-actions">
          <button className="btn btn-secondary" type="submit">Apply</button>
          <Link className="btn btn-ghost" to="/emails">Reset</Link>
        </div>
      </form>

      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : emails.length ? (
        <>
          <div className="card card-flush">
            <ul className="mail-list">
              {emails.map((e) => (
                <li key={e.id}>
                  <Link to={`/emails/${e.id}`} className="mail-row">
                    <span className="avatar">{initial(e.sender)}</span>
                    <span className="mail-main">
                      <span className="mail-top"><span className="mail-from truncate">{e.sender || 'Unknown sender'}</span><small className="muted nowrap">{dt(e.received_at)}</small></span>
                      <span className="mail-subject truncate">{e.subject || '(no subject)'}</span>
                      <span className="mail-snippet muted truncate">{e.snippet}</span>
                    </span>
                    <span className="mail-meta">
                      {e.scan_status === 'infected' && <span className="badge badge-danger" title="Malware detected"><Icon name="shield" /> Infected</span>}
                      {e.attachment_count > 0 && <span className="badge"><Icon name="paperclip" /> {e.attachment_count}</span>}
                      {e.gmail_state !== 'archived' && <EmailStateBadge state={e.gmail_state} />}
                      <small className="muted">{filesize(e.size)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Pagination page={page} pages={pages} />
        </>
      ) : (
        <div className="card">
          {q || state || hasAtt ? (
            <EmptyState title="No matching emails" text="Try a different search or clear the filters." icon="search" />
          ) : connected ? (
            <EmptyState title="No archived emails yet" text="Archive an email in Gmail and it will appear here within about 2 minutes." icon="mail">
              {!reauth && <GmailSyncButton className="btn btn-secondary btn-sm" />}
            </EmptyState>
          ) : (
            <EmptyState title="Gmail is not connected" text="Connect your Gmail to start archiving. Emails you archive in Gmail will appear here." icon="mail">
              {s && <GmailConnectButton className="btn btn-primary btn-sm" disabled={!configured} />}
            </EmptyState>
          )}
        </div>
      )}
    </>
  )
}
