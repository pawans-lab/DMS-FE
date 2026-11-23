import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { setLegalHold } from '../../api/admin'
import { deleteFolder, folderZipUrl, getFolder, rootFolder, setRetention } from '../../api/folders'
import { folderValidity } from '../../api/validity'
import { useAuth } from '../../auth/authContext'
import ActionButton from '../../components/ActionButton'
import DocumentTable from '../../components/DocumentTable'
import FavouriteButton from '../../components/FavouriteButton'
import Icon from '../../components/Icon'
import LegalHoldBadge from '../../components/LegalHoldBadge'
import Loading, { QueryError } from '../../components/Loading'
import Modal from '../../components/Modal'
import { useModals } from '../../components/modals/modalContext'
import EmptyState from '../../components/EmptyState'
import FolderValidityModal from '../../components/validity/FolderValidityModal'
import { useFolders, useTitle } from '../../hooks/data'
import { plural } from '../../lib/format'
import { actionsOf, canDo } from '../../lib/perms'
import { toast } from '../../lib/toast'

function RetentionModal({ folderId, onClose }) {
  const [keepLast, setKeepLast] = useState('')
  const [keepYears, setKeepYears] = useState('')
  const mutation = useMutation({
    mutationFn: () => setRetention(folderId, keepLast, keepYears),
    meta: { inline: true },
    onSuccess: () => { toast('Retention rule saved.', 'success'); onClose() },
  })
  return (
    <Modal title="Version retention" onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <p className="small muted">Applies to documents in this folder and its subfolders. Leave empty to inherit from the parent folder or the system setting. The current version is never removed.</p>
        <div className="field"><label htmlFor="ret-n">Keep the last N versions</label>
          <input type="text" id="ret-n" inputMode="numeric" value={keepLast} onChange={(e) => setKeepLast(e.target.value)} /></div>
        <div className="field"><label htmlFor="ret-y">Keep versions for X years</label>
          <input type="text" id="ret-y" inputMode="numeric" value={keepYears} onChange={(e) => setKeepYears(e.target.value)} /></div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

/** folders/browse.html for /folders (library root) and /folders/:id. */
export default function Browse() {
  const { id } = useParams()
  const folderId = id ? Number(id) : null
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const highlightId = Number(params.get('highlight')) || 0
  const { has, homeFolderId } = useAuth()
  const { open, setCurrentFolder } = useModals()
  const { tree, folders: allFolders } = useFolders()
  const [retentionOpen, setRetentionOpen] = useState(false)
  const [validityOpen, setValidityOpen] = useState(false)
  // 404 when the user may not see the folder as an ordinary user (e.g. an administrator's override access).
  const validity = useQuery({
    queryKey: ['folder-validity', folderId], queryFn: () => folderValidity(folderId), enabled: !!folderId, retry: false,
  })

  const query = useQuery({
    queryKey: folderId ? ['folder', folderId] : ['folders', 'root'],
    queryFn: () => (folderId ? getFolder(folderId) : rootFolder()),
  })
  const data = query.data
  const folder = data?.folder || null
  const crumbs = data?.breadcrumbs || []
  const inHome = crumbs.length > 0 && crumbs[0].name === 'My Files' && (!homeFolderId || crumbs[0].id === homeFolderId)
  const isSystem = !!folder && inHome && crumbs.length === 1 // the user's own My Files (G4: other system folders unknown)
  const label = (f) => (f.id === homeFolderId ? 'My Files' : f.name)
  const title = folder ? crumbs[crumbs.length - 1]?.name || folder.name : 'Shared library'
  useTitle(title)

  useEffect(() => {
    if (!folderId) return undefined
    setCurrentFolder({ id: folderId, inHome })
    return () => setCurrentFolder(null)
  }, [folderId, inHome, setCurrentFolder])

  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />

  // The library root has no folder JSON: its `permissions` are the repository permissions.
  const current = folder || { permissions: data.permissions || [] }
  const can = actionsOf(current)
  const subfolders = data.folders
  const documents = data.documents
  const links = data.shortcuts
  const subCount = (fid) => allFolders.filter((f) => f.parent_id === fid).length
  const zipUrl = folderZipUrl(folderId)

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {(!crumbs.length || crumbs[0].id !== homeFolderId) && <><Link to="/folders">Shared library</Link><span>/</span></>}
        {crumbs.map((c, i) => (i === crumbs.length - 1
          ? <span key={c.id} className="current">{c.name}</span>
          : <span key={c.id} style={{ display: 'contents' }}>
            {c.can_view ? <Link to={`/folders/${c.id}`}>{c.name}</Link> : <span className="muted">{c.name}</span>}<span>/</span>
          </span>))}
      </nav>

      <div className="page-head">
        <div>
          <h1 className="break">{title} {folder && <FavouriteButton kind="folder" id={folder.id} />} <LegalHoldBadge item={folder} />
            {folder && validity.data?.effective && (
              <> <span className="badge badge-primary" title="Documents in this folder are monitored for expiry"><Icon name="calendar" /> Validity monitoring</span></>
            )}</h1>
          <p className="muted">
            {plural(subfolders.length, 'folder')} · {plural(documents.length, 'document')}
            {links.length > 0 && <> · {plural(links.length, 'shortcut')}</>}
            {folder?.owner && !isSystem && <> · Owner: {folder.is_owner ? 'you' : folder.owner}</>}
          </p>
        </div>
        <div className="actions">
          {can('folder.upload') && (
            <button type="button" className="btn btn-primary" onClick={() => open('upload', folderId ? { folderId } : {})}><Icon name="upload" /> Upload Document</button>
          )}
          {can('folder.create_child') && (
            <button type="button" className="btn btn-secondary" onClick={() => open('folder', folderId ? { folderId } : {})}><Icon name="folder-plus" /> New folder</button>
          )}
          {folder && can('item.share') && (
            <Link className="btn btn-secondary" to={`/permissions/folder/${folder.id}`}><Icon name="share" /> Share</Link>
          )}
          {can('item.download') && (
            <a className="btn btn-ghost" href={zipUrl} title="Current version of every document you can download, including subfolders">
              <Icon name="download" /> {folder ? 'Download Folder (ZIP)' : 'Download library (ZIP)'}
            </a>
          )}
          <details className="menu">
            <summary className="btn btn-ghost" aria-label="More actions"><Icon name="more" /> More</summary>
            <div className="menu-list">
              {can('item.download') && <a href={folderZipUrl(folderId, true)}><Icon name="layers" /> Download ZIP with version history</a>}
              {folder ? (
                <>
                  {can('item.rename') && !isSystem && (
                    <button type="button" onClick={() => open('rename', { kind: 'folder', id: folder.id, name: folder.name })}><Icon name="edit" /> Rename folder</button>
                  )}
                  {can('item.move') && !isSystem && (
                    <button type="button" onClick={() => open('move', { kind: 'folder', id: folder.id, name: folder.name, current: folder.parent_id ?? '' })}>
                      <Icon name="move" /> Move folder
                    </button>
                  )}
                  {can('item.copy') && (
                    <button type="button" onClick={() => open('move', { kind: 'folder', mode: 'copy', id: folder.id, name: folder.name, current: folder.parent_id ?? '' })}>
                      <Icon name="copy" /> Copy folder to…
                    </button>
                  )}
                  {can('item.share') && <Link to={`/permissions/folder/${folder.id}#advanced`}><Icon name="key" /> Advanced permissions</Link>}
                  {has('admin') && !isSystem && (
                    <ActionButton action={() => setLegalHold('folder', folder.id, !folder.legal_hold)}
                      label={folder.legal_hold ? 'Release legal hold' : 'Place legal hold'} icon="shield" className=""
                      confirm={folder.legal_hold
                        ? `Release the legal hold on “${folder.name}”? It can then be deleted or moved again.`
                        : `Place “${folder.name}” and everything in it under a legal hold? Nobody can delete, purge or move it until the hold is released.`}
                      success={folder.legal_hold ? 'Legal hold released.' : 'Legal hold placed.'} />
                  )}
                  {validity.data?.can_edit && (
                    <button type="button" onClick={() => setValidityOpen(true)}><Icon name="calendar" /> Validity monitoring…</button>
                  )}
                  {has('admin') && <button type="button" onClick={() => setRetentionOpen(true)}><Icon name="history" /> Version retention</button>}
                  <Link to={`/folders/${folder.id}/history`}><Icon name="history" /> Folder history</Link>
                  {can('item.delete') && !isSystem && (
                    <ActionButton action={() => deleteFolder(folder.id)} label="Delete folder" icon="trash" className="menu-danger"
                      confirm={`Move the folder “${folder.name}” and everything in it to the recycle bin? It can be restored for a limited time.`}
                      success={`Folder '${folder.name}' and its contents moved to the recycle bin.`}
                      onSuccess={() => navigate(folder.parent_id ? `/folders/${folder.parent_id}` : '/folders')} />
                  )}
                </>
              ) : has('admin') && <Link to="/permissions/repository/0"><Icon name="key" /> Repository permissions</Link>}
            </div>
          </details>
        </div>
      </div>

      <div className="browse-grid">
        <aside className="card tree-card">
          <h2 className="small-head">Folders</h2>
          <ul className="tree">
            <li><Link to="/folders" className={!folder ? 'active' : undefined}><Icon name="home" /> Shared library</Link></li>
            {tree.map(({ folder: f, depth }) => (
              <li key={f.id} style={{ paddingLeft: depth * 14 }}>
                <Link to={`/folders/${f.id}`} className={folder && folder.id === f.id ? 'active' : undefined}>
                  <Icon name="folder" /><span className="truncate">{label(f)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          {subfolders.length > 0 && (
            <section className="folder-cards">
              {subfolders.map((f) => (
                <div className="folder-card" key={f.id}>
                  <Link className="folder-card-link" to={`/folders/${f.id}`}>
                    <span className="stat-icon si-amber"><Icon name="folder" /></span>
                    <span className="list-main"><span className="truncate">{label(f)}</span>
                      <small className="muted">{plural(subCount(f.id), 'folder')}</small></span>
                  </Link>
                  <FavouriteButton kind="folder" id={f.id} />
                  <LegalHoldBadge item={f} />
                  {canDo(f, 'item.download') && (
                    <a className="icon-btn" href={folderZipUrl(f.id)} title={`Download “${f.name}” as ZIP`} aria-label={`Download ${f.name} as ZIP`}>
                      <Icon name="download" />
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          {documents.length || links.length ? (
            <div className="card card-flush">
              <DocumentTable documents={documents} links={links} hideFolder highlightId={highlightId} linkFolder={current} />
            </div>
          ) : !subfolders.length && (
            <div className="card">
              <EmptyState title="This folder is empty" icon="folder"
                text={can('folder.upload') ? 'Use the Upload Document or New folder buttons above.' : 'There is nothing here you can see.'} />
            </div>
          )}
        </div>
      </div>

      {retentionOpen && folder && <RetentionModal folderId={folder.id} onClose={() => setRetentionOpen(false)} />}
      {validityOpen && folder && validity.data && (
        <FolderValidityModal folder={folder} setting={validity.data} onClose={() => setValidityOpen(false)} />
      )}
    </>
  )
}
