import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { activity } from '../api/admin'
import { dashboard } from '../api/documents'
import { gmailStatus } from '../api/gmail'
import { listEmails } from '../api/emails'
import { useAuth } from '../auth/authContext'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import { useModals } from '../components/modals/modalContext'
import EmptyState from '../components/EmptyState'
import GmailConnectButton from '../components/GmailConnectButton'
import FileTypeBadge from '../components/FileTypeBadge'
import { useAllDocuments, useFolders, useTitle } from '../hooks/data'
import { dt, filesize, initial } from '../lib/format'

/** dashboard.html. Lists missing from GET /dashboard are built from other endpoints (MIGRATION.md G2). */
export default function Dashboard() {
  useTitle('Home')
  const { user, label } = useAuth()
  const { open } = useModals()
  const { byId } = useFolders()
  const stats = useQuery({ queryKey: ['dashboard'], queryFn: dashboard })
  const docs = useAllDocuments()
  // Every user has their own email archive: stats.emails and GET /emails only count and list their own emails.
  const emails = useQuery({
    queryKey: ['emails', { sort: 'imported', per_page: 6 }], queryFn: () => listEmails({ sort: 'imported', per_page: 6 }),
  })
  const gmail = useQuery({ queryKey: ['gmail-status'], queryFn: gmailStatus, meta: { silent: true } })
  const events = useQuery({ queryKey: ['activity', 1, 8], queryFn: () => activity(1, 8) })

  const all = docs.data || []
  const byNewest = (key) => [...all].sort((a, b) => (b[key] || '').localeCompare(a[key] || ''))
  const recentDocs = byNewest('created_at').slice(0, 6)
  const updatedDocs = byNewest('updated_at').filter((d) => d.version_number > 1).slice(0, 6)
  const checkedOut = all.filter((d) => d.checked_out_by === user?.username)
    .sort((a, b) => (b.checked_out_at || '').localeCompare(a.checked_out_at || ''))
  const s = stats.data || {}
  const g = gmail.data
  const gmailConfigured = !!g?.configured && g.status !== 'not_configured'
  const gmailConnected = gmailConfigured && !!g.connected

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {label}</h1>
          <p className="muted">Uploads and new folders go to your private <Link to="/my-files">My Files</Link> until you share them.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => open('upload')}><Icon name="upload" /> Upload</button>
          <button type="button" className="btn btn-ghost" onClick={() => open('folder')}><Icon name="folder-plus" /> New folder</button>
          <Link className="btn btn-ghost" to="/shared"><Icon name="share" /> Shared with me</Link>
        </div>
      </div>

      <section className="stats">
        <Link className="stat" to="/documents">
          <span className="stat-icon si-blue"><Icon name="file" /></span>
          <span className="stat-body"><span className="stat-value">{s.documents ?? '—'}</span><span className="stat-label">Documents</span></span>
        </Link>
        <Link className="stat" to="/folders">
          <span className="stat-icon si-amber"><Icon name="folder" /></span>
          <span className="stat-body"><span className="stat-value">{s.folders ?? '—'}</span><span className="stat-label">Folders</span></span>
        </Link>
        <Link className="stat" to="/emails">
          <span className="stat-icon si-green"><Icon name="mail" /></span>
          <span className="stat-body"><span className="stat-value">{s.emails ?? '—'}</span><span className="stat-label">My archived emails</span></span>
        </Link>
        <Link className="stat" to="/versions">
          <span className="stat-icon si-violet"><Icon name="layers" /></span>
          <span className="stat-body"><span className="stat-value">{s.versions ?? '—'}</span><span className="stat-label">Stored versions</span></span>
        </Link>
      </section>

      {checkedOut.length > 0 && (
        <section className="card">
          <div className="card-head"><h2><Icon name="lock" /> Checked out to you</h2></div>
          <ul className="list compact">
            {checkedOut.map((d) => (
              <li key={d.id}><Link to={`/documents/${d.id}`} className="list-row"><FileTypeBadge ext={d.extension} />
                <span className="list-main"><span className="truncate">{d.name}</span><small className="muted">since {dt(d.checked_out_at)}</small></span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Recent documents</h2><Link to="/recent" className="link-sm">View all</Link></div>
          {docs.isPending ? <Loading /> : recentDocs.length ? (
            <ul className="list">
              {recentDocs.map((d) => (
                <li key={d.id}><Link to={`/documents/${d.id}`} className="list-row">
                  <FileTypeBadge ext={d.extension} />
                  <span className="list-main"><span className="truncate">{d.name}</span>
                    <small className="muted">{byId.get(d.folder_id)?.path || 'Root'} · {filesize(d.size)}</small></span>
                  <small className="muted nowrap">{dt(d.created_at, 'date')}</small>
                </Link></li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No documents yet" text="Use the Upload button above to add your first document." icon="file" />
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Recently updated</h2><Link to="/versions" className="link-sm">Version history</Link></div>
          {updatedDocs.length ? (
            <ul className="list">
              {updatedDocs.map((d) => (
                <li key={d.id}><Link to={`/documents/${d.id}`} className="list-row">
                  <FileTypeBadge ext={d.extension} />
                  <span className="list-main"><span className="truncate">{d.name}</span><small className="muted">Updated {dt(d.updated_at)}</small></span>
                  <span className="badge">v{d.version}</span>
                </Link></li>
              ))}
            </ul>
          ) : <EmptyState title="No updated documents" text="Documents with more than one version appear here." icon="layers" />}
        </section>

        <section className="card">
          <div className="card-head"><h2>My recent archived emails</h2><Link to="/emails" className="link-sm">View all</Link></div>
          {emails.data?.emails.length ? (
            <ul className="list">
              {emails.data.emails.map((e) => (
                <li key={e.id}><Link to={`/emails/${e.id}`} className="list-row">
                  <span className="avatar">{initial(e.sender)}</span>
                  <span className="list-main"><span className="truncate">{e.subject || '(no subject)'}</span><small className="muted truncate">{e.sender}</small></span>
                  <span className="list-meta">{e.attachment_count > 0 && <span className="muted"><Icon name="paperclip" /></span>}<small className="muted nowrap">{dt(e.imported_at, 'short')}</small></span>
                </Link></li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No archived emails yet" icon="mail"
              text={gmailConnected ? 'Archive an email in Gmail and it will appear here within about 2 minutes.' : 'Connect your Gmail to start archiving. Emails you archive in Gmail will appear here.'}>
              {g && !gmailConnected && <GmailConnectButton className="btn btn-primary btn-sm" disabled={!gmailConfigured} />}
            </EmptyState>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>My activity</h2><Link to="/activity" className="link-sm">View all</Link></div>
          {events.data?.events.length ? (
            <ul className="timeline">
              {events.data.events.map((a) => (
                <li key={a.id}><span className={`tl-dot tl-${a.category}`} />
                  <span className="tl-text">{a.message}</span>
                  <small className="muted nowrap">{dt(a.created_at, 'short')}</small></li>
              ))}
            </ul>
          ) : <EmptyState title="No activity yet" icon="activity" />}
        </section>
      </div>
    </>
  )
}
