import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { uuid } from '../../api/client'
import { emailBody, emlUrl, emlWithImagesUrl, getEmail, importAttachment, inlineDataUrl } from '../../api/emails'
import { useAuth } from '../../auth/authContext'
import FolderSelect from '../../components/FolderSelect'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import EmailStateBadge from '../../components/EmailStateBadge'
import { useTitle } from '../../hooks/data'
import { TYPE_LABELS, dt, extensionOf, filesize, initial } from '../../lib/format'
import { toast } from '../../lib/toast'

// The same policy as routes/emails.py BODY_CSP, minus what a srcdoc frame cannot use ('self').
const BODY_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"

const STATE_NOTES = {
  inbox: 'This message is currently in the Gmail Inbox. The archived copy is retained here.',
  trashed: 'This message has been moved to Trash in Gmail. The archived copy is retained here.',
  spam: 'This message has been marked as spam in Gmail. The archived copy is retained here.',
  deleted: 'This message has been permanently deleted from Gmail. The archived copy is retained here.',
}

/**
 * The message HTML from GET /emails/<id>/body (JSON, MIGRATION.md G11) as an iframe srcdoc document.
 * Inline images become data: URLs and a CSP <meta> blocks scripts and remote content. The HTML is never
 * put into this page's DOM.
 */
async function messageDocument(id) {
  let html = await emailBody(id)
  // render_preview_html points embedded images at /inline/<n> and stored copies of linked images
  // (newsletter logos etc.) at /images/<n>, both paths on this server.
  const pattern = new RegExp(`/api/v1/emails/${id}/(inline|images)/(\\d+)(?!\\d)`, 'g')
  const refs = [...new Set([...html.matchAll(pattern)].map((m) => m[0]))]
  const found = {}
  await Promise.all(refs.map(async (ref) => {
    const [, kind, part] = ref.match(/\/(inline|images)\/(\d+)$/)
    try {
      found[ref] = await inlineDataUrl(id, part, kind)
    } catch { /* leave the image broken */ }
  }))
  html = html.replace(pattern, (ref) => found[ref] || ref)
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${BODY_CSP}">${html}`
}

function ImportModal({ email, attachment, onClose }) {
  const navigate = useNavigate()
  const [folderId, setFolderId] = useState('')
  const [key] = useState(uuid)
  // Same-named document already in the folder: ask before replacing it (nothing is saved until then).
  const [duplicate, setDuplicate] = useState(null)
  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: (onDuplicate = 'ask') => importAttachment({
      email_id: email.id, part_index: attachment.part_index, folder_id: folderId, idempotency_key: key, on_duplicate: onDuplicate,
      // Only after the prompt told the user the file is identical and they still chose Replace.
      // The prompt appears only for identical content, so Replace means "replace the identical copy".
      ...(onDuplicate === 'replace' ? { allow_identical: '1' } : {}),
    }),
    onError: (err) => { if (err.code === 'duplicate_document') setDuplicate(err.data?.duplicate || {}) },
    onSuccess: (r) => {
      toast(r.versioned ? `'${r.document.name}' saved as version ${r.version} of the existing document.`
        : r.created ? `'${r.document.name}' saved to the document library.` : `'${r.document.name}' was already saved.`, 'success')
      onClose()
      navigate(`/documents/${r.document.id}`)
    },
  })
  if (duplicate) {
    return (
      <Modal title="Same document already exists" onClose={onClose} small>
        <p>“{duplicate.name || attachment.filename}” is already in this folder with exactly the same content
          {duplicate.identical_version ? ` (version ${duplicate.identical_version}${duplicate.identical_is_current ? ', current' : ''})` : ''}.</p>
        <p className="muted">Replace removes the existing identical copy and keeps this attachment instead (other versions are not affected). Cancel leaves everything unchanged.</p>
        {duplicate.can_replace === false && <p className="form-error">{duplicate.reason || 'You cannot replace this document.'}</p>}
        {mutation.error && mutation.error.code !== 'duplicate_document' && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          {duplicate.can_replace !== false && (
            <button type="button" className="btn btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate('replace')}>
              Replace
            </button>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Save to Document Library" onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate('ask') }}>
        <p className="muted">Save a copy of “{attachment.filename}” as a new document.</p>
        <div className="field">
          <label htmlFor="import-folder">Destination folder</label>
          <FolderSelect id="import-folder" value={folderId} onChange={setFolderId} />
        </div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>Save document</button>
        </div>
      </form>
    </Modal>
  )
}

/** emails/detail.html. */
export default function EmailDetail() {
  const { id } = useParams()
  const emailId = Number(id)
  const { homeFolderId } = useAuth()
  const [importing, setImporting] = useState(null)
  const query = useQuery({ queryKey: ['email', emailId], queryFn: () => getEmail(emailId) })
  const body = useQuery({ queryKey: ['email-body', emailId], queryFn: () => messageDocument(emailId), retry: false })
  const email = query.data
  useTitle(email ? email.subject || '(no subject)' : 'Email')

  if (query.isPending) return <Loading />
  // Someone else's email is a 404 too: never suggest that it exists or that access is missing.
  if (query.isError && query.error.status === 404) {
    return (
      <div className="card">
        <EmptyState title="Email not found" text="This email does not exist in your Email Archive." icon="mail">
          <Link className="btn btn-secondary btn-sm" to="/emails">Back to Email Archive</Link>
        </EmptyState>
      </div>
    )
  }
  if (query.isError) return <QueryError error={query.error} />

  const subject = email.subject || '(no subject)'
  const visible = email.attachments.filter((a) => !a.is_inline)
  const infected = email.scan_status === 'infected'
  const importable = (name) => !!TYPE_LABELS[extensionOf(name)]
  const fileType = (a) => TYPE_LABELS[extensionOf(a.filename)] || (extensionOf(a.filename) || a.content_type.split('/').pop()).toUpperCase()
  const fileMissing = body.isError && body.error?.code === 'not_found'

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/emails">Email Archive</Link><span>/</span><span className="current truncate">{subject}</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="break">{subject}</h1>
          <p className="muted"><EmailStateBadge state={email.gmail_state} /> · Archived {dt(email.imported_at)}</p>
        </div>
        <div className="actions">
          {!fileMissing && (
            <a className="btn btn-secondary" href={emlWithImagesUrl(email.id)}
              title="A copy of the email with its images included, so they show in any mail program, even offline. The archived original is not changed.">
              <Icon name="download" /> Download with images (.eml)
            </a>
          )}
          {!fileMissing && <a className="btn btn-primary" href={emlUrl(email.id)}><Icon name="download" /> Download original (.eml)</a>}
        </div>
      </div>

      {fileMissing && <div className="notice notice-error"><Icon name="alert" /><div>The original message file is missing from storage.</div></div>}
      {infected && (
        <div className="notice notice-error"><Icon name="shield" /><div>Malware was detected in this message (threat found). The archived copy is retained for the record, but its attachments cannot be downloaded or saved to the library.</div></div>
      )}
      {STATE_NOTES[email.gmail_state] && <div className="notice notice-info"><Icon name="alert" /><div>{STATE_NOTES[email.gmail_state]}</div></div>}

      <div className="detail-grid">
        <section className="card card-flush">
          <div className="mail-headers pad">
            <div className="mail-header-row"><span className="avatar avatar-lg">{initial(email.sender)}</span>
              <div className="list-main">
                <strong className="break">{email.sender}</strong>
                <small className="muted break">To: {email.recipients || '—'}</small>
                {email.cc && <small className="muted break">Cc: {email.cc}</small>}
              </div>
              <small className="muted nowrap">{dt(email.received_at)}</small>
            </div>
          </div>
          {visible.length > 0 && (
            // Attachment details only (name, type, size): attached files are not opened or downloaded here.
            <div className="attachments pad" aria-label="Attachments">
              {visible.map((a) => (
                <span key={a.part_index} className="attachment" title={`${a.filename} · ${a.content_type} · ${filesize(a.size)}`}>
                  <Icon name={infected ? 'shield' : 'paperclip'} /><span className="truncate">{a.filename}</span>
                  <small className="muted">{fileType(a)} · {filesize(a.size)}</small>
                </span>
              ))}
            </div>
          )}
          {body.data && (
            <iframe className="mail-frame" srcDoc={body.data} sandbox="allow-popups allow-popups-to-escape-sandbox"
              title="Message body" referrerPolicy="no-referrer" />
          )}
          {body.isPending && <p className="muted pad">Loading message…</p>}
          <p className="small muted pad">For your security, scripts and remote content in emails are blocked in this preview; images the email links to are shown from copies stored in JMBVault. Attachments are listed with their details only. The original message is preserved unmodified in the .eml file.</p>
        </section>

        <aside className="side-col">
          <section className="card">
            <h2>Archive record</h2>
            <dl className="meta">
              <dt>Gmail message ID</dt><dd className="mono small">{email.gmail_message_id}</dd>
              <dt>Gmail thread ID</dt><dd className="mono small">{email.gmail_thread_id || '—'}</dd>
              <dt>Received</dt><dd>{dt(email.received_at)}</dd>
              <dt>Archived</dt><dd>{dt(email.imported_at)}</dd>
              <dt>Gmail status</dt><dd><EmailStateBadge state={email.gmail_state} /></dd>
              <dt>Original size</dt><dd>{filesize(email.size)}</dd>
              <dt>SHA-256</dt><dd className="mono small break">{email.sha256}</dd>
            </dl>
          </section>
          {visible.length > 0 && (
            <section className="card">
              <h2>Attachments ({visible.length})</h2>
              <ul className="list compact">
                {visible.map((a) => (
                  <li key={a.part_index} className="list-row">
                    <span className="list-main"><span className="truncate" title={a.filename}>{a.filename}</span>
                      <small className="muted">{fileType(a)} · {a.content_type} · {filesize(a.size)}</small></span>
                    {importable(a.filename) && !infected && (
                      <button type="button" className="icon-btn" title="Save to Document Library" aria-label={`Save ${a.filename} to the document library`}
                        onClick={() => setImporting(a)}><Icon name="folder-plus" /></button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="small muted">Saving an attachment creates an independent copy in the Document Library. The archived email and its .eml file are not changed.</p>
            </section>
          )}
        </aside>
      </div>

      {importing && <ImportModal key={homeFolderId} email={email} attachment={importing} onClose={() => setImporting(null)} />}
    </>
  )
}
