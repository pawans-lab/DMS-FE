import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gmailDisconnect, gmailRetry, gmailStatus } from '../../api/gmail'
import ActionButton from '../../components/ActionButton'
import GmailConnectButton from '../../components/GmailConnectButton'
import GmailStatusBadge from '../../components/GmailStatusBadge'
import GmailSyncButton from '../../components/GmailSyncButton'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useTitle } from '../../hooks/data'
import { dt, every } from '../../lib/format'

const WARNINGS = new Set(['partial', 'error', 'network'])

/** The signed-in user's own Gmail mailbox → GET /gmail/status, /gmail/connect, POST /gmail/sync|retry|disconnect. */
export default function GmailSettings() {
  useTitle('Gmail Connection')
  const query = useQuery({ queryKey: ['gmail-status'], queryFn: gmailStatus })
  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  const s = query.data
  const configured = s.configured && s.status !== 'not_configured'
  const reauth = s.status === 'reauth_required'
  const connected = configured && s.connected
  const domains = s.allowed_domains || []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Gmail Connection</h1>
          <p className="muted">Archive an email in your Gmail and it is saved to your <Link to="/emails">Email Archive</Link> as the complete original .eml message. Only you can see your archived emails.</p>
        </div>
      </div>

      {!configured && (
        <div className="notice notice-error"><Icon name="alert" /><div>Gmail archiving is not set up on the server. Contact the administrator.</div></div>
      )}
      {configured && reauth && (
        <div className="notice notice-error" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Archiving is paused.</strong> Google access for {s.account ? <strong>{s.account}</strong> : 'your mailbox'} has expired or was revoked (for example after a Google password change). Reconnect to resume archiving.
            {s.error && <div className="small">{s.error}</div>}
          </div>
          <GmailConnectButton label="Reconnect Gmail" />
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>My mailbox</h2><GmailStatusBadge status={configured ? s.status : 'not_configured'} /></div>
          {connected ? (
            <>
              <dl className="meta">
                <dt>Gmail account</dt><dd className="break">{s.account}</dd>
                <dt>Connected</dt><dd>{dt(s.connected_at)}</dd>
                <dt>Last sync</dt><dd>{s.last_sync_at ? dt(s.last_sync_at) : 'Waiting for first sync'}</dd>
                <dt>Last success</dt><dd>{s.last_success_at ? dt(s.last_success_at) : 'Not yet'}</dd>
                <dt>Archived emails</dt><dd><Link to="/emails">{s.archived_total}</Link></dd>
                <dt>Waiting to import</dt><dd>{s.pending}</dd>
                <dt>Failed imports</dt><dd>{s.failed}</dd>
              </dl>
              {WARNINGS.has(s.status) && s.error && (
                <div className="notice notice-info"><Icon name="alert" /><div>{s.error}{s.status !== 'partial' && ' It is retried automatically.'}</div></div>
              )}
              {s.failed > 0 && <div className="notice notice-error"><Icon name="alert" /><div>{s.failed} email(s) could not be imported after several attempts.</div></div>}
              <div className="actions">
                {!reauth && <GmailSyncButton className="btn btn-primary" disabled={s.sync_in_progress} />}
                {s.failed > 0 && (
                  <ActionButton action={gmailRetry} label="Retry failed" icon="refresh" className="btn btn-secondary"
                    success={(r) => `${r.queued} failed import(s) queued for retry.`} />
                )}
                <ActionButton action={gmailDisconnect} label="Disconnect" className="btn btn-ghost btn-danger-text"
                  confirm="Disconnect Gmail? New archived emails will no longer be imported. Emails already archived stay in JMBVault."
                  success="Gmail disconnected. Your archived emails remain in JMBVault." />
              </div>
            </>
          ) : reauth ? (
            <p className="muted">Archiving resumes after you reconnect. Your archived emails stay in JMBVault.</p>
          ) : (
            <>
              <p>Connect your Gmail once. After that, every email you archive in Gmail is saved to JMBVault automatically, even when you are not signed in to JMBVault. Only you can see your archived emails.</p>
              {s.status === 'disconnected' && s.account && (
                <p className="muted small"><strong>{s.account}</strong> was disconnected. Emails already archived from it stay in your Email Archive.</p>
              )}
              {domains.length > 0 && <p className="muted small">Use your {domains.map((d) => `@${d}`).join(' or ')} account.</p>}
              <p className="muted small">You&apos;ll be asked to sign in with Google and grant read-only access. Access is stored on the server only.</p>
              <GmailConnectButton disabled={!configured} />
            </>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>How it works</h2>
            {configured && <span className={`badge ${s.scheduler_running ? 'badge-ok' : 'badge-warn'}`}>{s.scheduler_running ? 'Running' : 'Stopped'}</span>}
          </div>
          <ul className="small">
            <li>The server checks your Gmail every {every(s.interval_seconds)} and imports the emails you archived (removed from the Inbox). New emails appear within about {every(s.interval_seconds)}.</li>
            <li>This runs on the server: you do not need to keep JMBVault or Gmail open.</li>
            <li>Your archived emails are private. Nobody else, including administrators, can open or search them.</li>
            <li>Connecting a different Gmail address replaces this one. Emails already archived stay in your archive.</li>
            <li>Trashed or spam messages are not imported.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
