import { Fragment, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { setLegalHold } from '../../api/admin'
import { uuid } from '../../api/client'
import {
  checkout, contentUrl, deleteDocument, getDocument, previewUrl, release, removeLink, renderUrl, restoreVersion,
  textPreview, updateDocument,
} from '../../api/documents'
import { useAuth } from '../../auth/authContext'
import ActionButton from '../../components/ActionButton'
import FavouriteButton from '../../components/FavouriteButton'
import Icon from '../../components/Icon'
import LegalHoldBadge from '../../components/LegalHoldBadge'
import Loading, { QueryError } from '../../components/Loading'
import MetadataFields, { TagsField } from '../../components/MetadataFields'
import { useModals } from '../../components/modals/modalContext'
import FileTypeBadge from '../../components/FileTypeBadge'
import { useFolders, useMetadataSchema, useTitle } from '../../hooks/data'
import { checkTags, dt, filesize, typeLabel } from '../../lib/format'
import { actionsOf, canDo } from '../../lib/perms'
import { refreshData } from '../../lib/query'
import { toast } from '../../lib/toast'

const TEXT_PREVIEW_LIMIT = 512 * 1024

function Preview({ doc, preview, canDownload }) {
  const kind = preview.kind
  const text = useQuery({ queryKey: ['text-preview', doc.id, doc.version_number], queryFn: () => textPreview(doc.id), enabled: kind === 'text' })
  const none = (
    <div className="preview-none">
      <FileTypeBadge ext={doc.extension} />
      <h3>Preview not available</h3>
      <p className="muted">{typeLabel(doc.extension)} files can&apos;t be previewed in the browser.{canDownload && ' Download the original file to open it.'}</p>
      {canDownload && <a className="btn btn-primary" href={contentUrl(doc.id)}><Icon name="download" /> Download original</a>}
    </div>
  )
  const src = `${previewUrl(doc.id)}?v=${doc.version_number}`
  // View-only access: hide the browser PDF viewer's toolbar (download/print) and media download controls.
  const pdfSrc = canDownload ? src : `${src}#toolbar=0&navpanes=0`
  const imgGuard = canDownload ? {} : { onContextMenu: (e) => e.preventDefault(), draggable: false }
  const guard = canDownload ? {} : { ...imgGuard, controlsList: 'nodownload' }
  if (kind === 'pdf') return <iframe className="preview-frame" src={pdfSrc} title="PDF preview" />
  if (kind === 'image') return <div className="preview-image"><img src={src} alt={doc.name} {...imgGuard} /></div>
  if (kind === 'video') {
    return <div className="preview-image"><video controls preload="metadata" src={src} {...guard}>Your browser cannot play this video.</video></div>
  }
  if (kind === 'audio') return <div className="preview-none"><audio controls preload="metadata" src={src} {...guard}>Your browser cannot play this audio file.</audio></div>
  if (kind === 'text') {
    if (text.isPending) return <p className="muted pad">Loading preview…</p>
    if (text.isError) return none
    const truncated = text.data.length > TEXT_PREVIEW_LIMIT
    return (
      <>
        <pre className="preview-text">{text.data.slice(0, TEXT_PREVIEW_LIMIT)}</pre>
        {truncated && <p className="muted pad">Preview truncated. Download the file to see the full content.</p>}
      </>
    )
  }
  if (kind === 'office' && preview.office_mode === 'pdf') return <iframe className="preview-frame" src={pdfSrc} title="Document preview" />
  if (kind === 'office' && preview.office_mode === 'html') {
    return <iframe className="preview-frame" sandbox="" src={`${renderUrl(doc.id)}?v=${doc.version_number}`} title="Document preview" />
  }
  return none
}

function Properties({ doc, editable }) {
  const queryClient = useQueryClient()
  const [typeId, setTypeId] = useState(doc.document_type_id ? String(doc.document_type_id) : '')
  const [error, setError] = useState('')
  const schema = useMetadataSchema(doc.folder_id, typeId).data
  const readSchema = useMetadataSchema(doc.folder_id, doc.document_type_id).data
  const fields = (editable ? schema : readSchema)?.fields || []
  const values = Object.fromEntries(fields.map((f) => [String(f.id), doc.metadata[f.name] ?? '']))
  const mutation = useMutation({
    mutationFn: (body) => updateDocument(doc.id, body),
    meta: { inline: true },
    onSuccess: () => toast('Properties saved.', 'success'),
    onError: (err) => {
      setError(err.message)
      if (err.status === 409) refreshData(queryClient) // show the latest details so the user can redo the change
    },
  })

  if (!editable) {
    return (
      <dl className="meta">
        <dt>Document type</dt><dd>{doc.document_type || '—'}</dd>
        {fields.map((f) => <Fragment key={f.id}><dt>{f.label}</dt><dd>{doc.metadata[f.name] || '—'}</dd></Fragment>)}
        <dt>Tags</dt>
        <dd>{doc.tags.length ? doc.tags.map((t) => <span key={t}><Link className="badge" to={`/documents?tag=${encodeURIComponent(t)}`}>{t}</Link> </span>) : '—'}</dd>
      </dl>
    )
  }

  function submit(e) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const tagError = checkTags(form.elements.tags.value, schema?.tags || [], schema?.tags_controlled)
    if (tagError) { setError(tagError); return }
    // row_version: the server refuses (409) if someone else saved changes after this page loaded.
    const body = { document_type_id: typeId, tags: form.elements.tags.value, row_version: doc.row_version }
    form.querySelectorAll('[name^="meta_"]').forEach((el) => { body[el.name] = el.value })
    mutation.mutate(body)
  }

  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="d-type">Document type</label>
        <select id="d-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">(none)</option>
          {(schema?.types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></div>
      <MetadataFields key={fields.map((f) => f.id).join()} fields={fields} values={values} />
      <TagsField id="d-tags" tags={schema?.tags} controlled={schema?.tags_controlled} defaultValue={doc.tags.join(', ')} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-secondary btn-sm" type="submit" disabled={mutation.isPending}>Save properties</button>
    </form>
  )
}

/** documents/detail.html. */
export default function DocumentDetail() {
  const { id } = useParams()
  const docId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, has, homeFolderId, rootPerms } = useAuth()
  const { open } = useModals()
  const { byId } = useFolders()
  const [picks, setPicks] = useState([])
  const query = useQuery({ queryKey: ['document', docId], queryFn: () => getDocument(docId) })
  const data = query.data
  useTitle(data?.document.name || 'Document')

  useEffect(() => {
    if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [data, location.hash])

  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />

  const { document: doc, breadcrumbs: trail, versions, links, preview } = data
  const can = actionsOf(doc)
  const mine = doc.checked_out_by === user?.username
  const locked = !!doc.checked_out_by && !mine
  const current = versions.find((v) => v.current)
  const compareOk = preview.compare_supported && versions.length > 1
  const folder = doc.folder_id ? byId.get(doc.folder_id) : null
  const docInfo = { id: doc.id, name: doc.name, extension: doc.extension, version: doc.version, version_number: doc.version_number }
  const folderOf = (fid) => (fid ? byId.get(fid) : { permissions: rootPerms })
  const homeFirst = trail.length > 0 && trail[0].id === homeFolderId

  const togglePick = (n) => setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))
  const compare = () => {
    const [a, b] = [...picks].sort((x, y) => x - y)
    navigate(`/documents/${doc.id}/compare?a=${a}&b=${b}`)
  }

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {!homeFirst && <Link to="/folders">Shared library</Link>}
        {trail.map((c, i) => (
          <span key={c.id} style={{ display: 'contents' }}>
            {(i > 0 || !homeFirst) && <span>/</span>}
            {c.can_view ? <Link to={`/folders/${c.id}`}>{c.name}</Link> : <span className="muted">{c.name}</span>}
          </span>
        ))}
      </nav>

      <div className="page-head">
        <div className="title-row">
          <FileTypeBadge ext={doc.extension} />
          <div>
            <h1 className="break">{doc.name} {!doc.deleted && <FavouriteButton kind="document" id={doc.id} />} <LegalHoldBadge item={doc} /></h1>
            <p className="muted">
              {typeLabel(doc.extension)} · {filesize(doc.size)} · Version {doc.version} · Updated {dt(doc.updated_at)}
              {' · '}<a href="#versions" onClick={(e) => { e.preventDefault(); document.getElementById('versions')?.scrollIntoView({ behavior: 'smooth' }) }}>
                {versions.length} version{versions.length === 1 ? '' : 's'} stored · View history
              </a>
            </p>
            {doc.checked_out_by && (
              <p><span className="badge badge-warn"><Icon name="lock" /> Checked out by {mine ? 'you' : doc.checked_out_by} since {dt(doc.checked_out_at)}</span></p>
            )}
          </div>
        </div>
        <div className="actions">
          {can('item.download') && <a className="btn btn-primary" href={contentUrl(doc.id)}><Icon name="download" /> Download</a>}
          {can('item.share') && <Link className="btn btn-secondary" to={`/permissions/document/${doc.id}`}><Icon name="share" /> Share</Link>}
          {can('item.version.create') && mine && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => open('newVersion', { doc: docInfo, checkIn: true })}><Icon name="unlock" /> Check in</button>
              <ActionButton action={() => release(doc.id)} label="Discard check-out" className="btn btn-ghost"
                confirm="Release the check-out without uploading a new version?" success="Check-out released." />
            </>
          )}
          {can('item.version.create') && !mine && !locked && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => open('newVersion', { doc: docInfo })}><Icon name="upload" /> Upload New Version</button>
              <ActionButton action={() => checkout(doc.id)} label="Check out" icon="lock" className="btn btn-ghost"
                title="Lock the document so only you can change it"
                success={`'${doc.name}' is checked out to you. Others cannot change it until you check it in.`} />
            </>
          )}
          {locked && (has('records') || can('item.share')) && (
            <ActionButton action={() => release(doc.id)} label="Override check-out" className="btn btn-ghost btn-danger-text"
              confirm={`Release the check-out held by ${doc.checked_out_by}? Their unsaved changes will not be uploaded.`}
              success="Check-out released." />
          )}
          <details className="menu">
            <summary className="btn btn-ghost" aria-label="More actions"><Icon name="more" /> More</summary>
            <div className="menu-list">
              {compareOk && <Link to={`/documents/${doc.id}/compare`}><Icon name="compare" /> Compare versions</Link>}
              {can('item.rename') && !locked && (
                <button type="button" onClick={() => open('rename', { kind: 'document', id: doc.id, name: doc.name })}><Icon name="edit" /> Rename</button>
              )}
              {can('item.move') && !locked && (
                <button type="button" onClick={() => open('move', { kind: 'document', id: doc.id, name: doc.name, current: doc.folder_id ?? '' })}>
                  <Icon name="move" /> Move
                </button>
              )}
              {can('item.copy') && (
                <button type="button" onClick={() => open('move', { kind: 'document', mode: 'copy', id: doc.id, name: doc.name, current: doc.folder_id ?? '' })}>
                  <Icon name="copy" /> Copy to…
                </button>
              )}
              <button type="button" onClick={() => open('move', { kind: 'document', mode: 'link', id: doc.id, name: doc.name, current: doc.folder_id ?? '' })}>
                <Icon name="shortcut" /> Add shortcut in another folder
              </button>
              {can('item.share') && <Link to={`/permissions/document/${doc.id}#advanced`}><Icon name="key" /> Advanced permissions</Link>}
              {has('admin') && !doc.deleted && (
                <ActionButton action={() => setLegalHold('document', doc.id, !doc.legal_hold)}
                  label={doc.legal_hold ? 'Release legal hold' : 'Place legal hold'} icon="shield" className=""
                  confirm={doc.legal_hold
                    ? `Release the legal hold on “${doc.name}”? It can then be deleted or moved again.`
                    : `Place “${doc.name}” under a legal hold? Nobody can delete, purge or move it until the hold is released.`}
                  success={doc.legal_hold ? 'Legal hold released.' : 'Legal hold placed.'} />
              )}
              {can('item.delete') && !locked && (
                <ActionButton action={() => deleteDocument(doc.id)} label="Delete" icon="trash" className="menu-danger"
                  confirm={`Move “${doc.name}” to the recycle bin? You can restore it later.`}
                  success={`'${doc.name}' moved to the recycle bin.`} onSuccess={() => navigate('/documents')} />
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card card-flush preview-card">
          <div className="card-head pad"><h2>Preview</h2></div>
          <Preview doc={doc} preview={preview} canDownload={can('item.download')} />
        </section>

        <aside className="side-col">
          <section className="card">
            <h2>Details</h2>
            <dl className="meta">
              <dt>Location</dt><dd>{doc.folder_id ? <Link to={`/folders/${doc.folder_id}`}>{folder?.path || trail.map((c) => c.name).join(' / ')}</Link> : 'Root'}</dd>
              <dt>Owner</dt><dd>{doc.owner ? (doc.is_owner ? `${doc.owner} (you)` : doc.owner) : '—'}</dd>
              <dt>Author</dt><dd>{doc.author || '—'}</dd>
              {doc.legal_hold && <><dt>Legal hold</dt><dd>Yes — cannot be deleted, purged or moved</dd></>}
              <dt>Type</dt><dd>{typeLabel(doc.extension)} (.{doc.extension})</dd>
              <dt>Size</dt><dd>{filesize(doc.size)}</dd>
              <dt>Created</dt><dd>{dt(doc.created_at)}</dd>
              <dt>Modified</dt><dd>{dt(doc.updated_at)}</dd>
              <dt>Version</dt><dd>{doc.version} ({versions.length} stored)</dd>
              <dt>SHA-256</dt><dd className="mono small break">{doc.sha256}</dd>
            </dl>
          </section>

          <section className="card" id="properties">
            <div className="card-head"><h2>Properties</h2></div>
            <Properties key={`${doc.id}-${doc.updated_at}`} doc={doc} editable={can('item.metadata.edit') && !doc.deleted && !locked} />
          </section>

          {links.length > 0 && (
            <section className="card">
              <h2>Shortcuts</h2>
              <p className="small muted">This document also appears in:</p>
              <ul className="list compact">
                {links.map((l) => (
                  <li key={l.id} className="list-row">
                    <span className="list-main">{l.folder_id ? <Link to={`/folders/${l.folder_id}`}>{l.folder_path}</Link> : 'Root'}</span>
                    {canDo(folderOf(l.folder_id), 'folder.upload') && (
                      <ActionButton action={() => removeLink(l.id)} className="icon-btn" icon="trash" title="Remove shortcut" success="Shortcut removed." />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" id="versions">
            <div className="card-head"><h2>Version history</h2><span className="small muted">{versions.length} stored</span></div>
            <p className="small muted">Every version is kept. Restoring creates a new version with the old content; nothing is erased.</p>
            <ol className="versions">
              {versions.map((v) => {
                const isCurrent = v.current
                const kind = isCurrent ? 'Latest version' : v.number === 1 ? 'Original upload' : v.restored_from ? 'Restored' : 'Previous version'
                return (
                  <li key={v.number} className={isCurrent ? 'is-current' : undefined}>
                    <div className="v-head">
                      {compareOk && (
                        <input type="checkbox" aria-label={`Select version ${v.label} to compare`} checked={picks.includes(v.number)}
                          disabled={!picks.includes(v.number) && picks.length >= 2} onChange={() => togglePick(v.number)} />
                      )}
                      <span className={`badge${isCurrent ? ' badge-primary' : ''}`}>v{v.label}</span>
                      <span className="small muted">{kind}{v.number === 1 && isCurrent && ' · original upload'}</span>
                      <span className="small muted push">{dt(v.created_at)}</span>
                    </div>
                    <div className="small muted">{filesize(v.size)}{v.created_by && ` · ${v.created_by}`}</div>
                    {v.note && <div className="small">{v.note}</div>}
                    <div className="v-actions">
                      {can('item.download') && (
                        <a className="btn btn-ghost btn-xs" href={contentUrl(doc.id, v.number)}><Icon name="download" /> Download v{v.label}</a>
                      )}
                      {!doc.deleted && current && !isCurrent && can('item.version.restore') && !locked && (
                        <ActionButton action={() => restoreVersion(doc.id, v.number, uuid(), doc.version_number)} label="Restore this version" icon="restore"
                          className="btn btn-ghost btn-xs"
                          confirm={`Restore version ${v.label}? Its content becomes a new current version; existing versions are kept.`}
                          success={(r) => (r.created ? `Restored ${v.label} as new version ${r.version}.` : 'Already restored.')} />
                      )}
                      {can('item.share') && (
                        <Link className="btn btn-ghost btn-xs" to={`/permissions/version/${doc.id}/${v.number}`}><Icon name="key" /> Access</Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            {compareOk && (
              <button className="btn btn-secondary btn-sm" type="button" disabled={picks.length !== 2} onClick={compare}>
                <Icon name="compare" /> Compare selected
              </button>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
