import { Fragment, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentUrl, deleteDocument, getDocument, removeLink } from '../api/documents'
import { useAuth } from '../auth/authContext'
import { useFolders } from '../hooks/data'
import { dt, filesize, typeLabel } from '../lib/format'
import { actionsOf, canDo } from '../lib/perms'
import ActionButton from './ActionButton'
import FavouriteButton from './FavouriteButton'
import Icon from './Icon'
import LegalHoldBadge from './LegalHoldBadge'
import { useModals } from './modals/modalContext'
import FileTypeBadge from './FileTypeBadge'
import SortHeader from './SortHeader'

const COLUMNS = [
  ['Name', 'name', ''], ['Type', 'type', 'hide-md'], ['Size', 'size', 'num'], ['Folder', 'folder', 'hide-md'],
  ['Uploaded', 'uploaded', 'hide-lg'], ['Modified', 'modified', 'hide-sm'], ['Version', 'version', ''],
]

/**
 * Every stored version of one document, shown under its row when the version badge is clicked.
 * Uses the same query as the document page, so both stay in sync after an upload.
 */
function VersionList({ doc }) {
  const query = useQuery({ queryKey: ['document', doc.id], queryFn: () => getDocument(doc.id) })
  if (query.isPending) return <p className="small muted">Loading versions…</p>
  if (query.isError) return <p className="small form-error">Could not load the versions: {query.error.message}</p>
  const { versions, document: latest } = query.data
  const canDownload = canDo(latest, 'item.download')
  return (
    <div className="version-panel">
      <ol className="versions compact">
        {versions.map((v) => (
          <li key={v.number} className={v.current ? 'is-current' : undefined}>
            <div className="v-head">
              <span className={`badge${v.current ? ' badge-primary' : ''}`}>v{v.label}</span>
              <span className="small muted">
                {v.current ? 'Latest version' : v.number === 1 ? 'Original upload' : v.restored_from ? 'Restored' : 'Previous version'}
              </span>
              <span className="small muted">{dt(v.created_at)} · {filesize(v.size)}{v.created_by && ` · ${v.created_by}`}</span>
              {canDownload && (
                <a className="btn btn-ghost btn-xs push" href={contentUrl(doc.id, v.number)}><Icon name="download" /> Download v{v.label}</a>
              )}
            </div>
            {v.note && <div className="small">{v.note}</div>}
          </li>
        ))}
      </ol>
      <Link className="small" to={`/documents/${doc.id}#versions`}>Open full version history (compare, restore) →</Link>
    </div>
  )
}

/**
 * documents/_table.html. `links` are shortcuts ({link_id, document}); `linkFolder` is the folder they sit
 * in (a folder JSON, or `{ permissions }` for the library root): removing one needs folder.upload there.
 */
export default function DocumentTable({
  documents = [], links = [], sortable = false, sort, direction, hideFolder = false, highlightId, linkFolder = null,
}) {
  const { user } = useAuth()
  const { byId } = useFolders()
  const { open } = useModals()
  const [expanded, setExpanded] = useState(() => new Set())
  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  useEffect(() => {
    if (highlightId) document.getElementById(`doc-${highlightId}`)?.scrollIntoView({ block: 'center' })
  }, [highlightId, documents.length])

  const columns = COLUMNS.filter(([, key]) => !(hideFolder && key === 'folder'))
  const folderOf = (d) => (d.folder_id ? byId.get(d.folder_id) : null)

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(([label, key, cls]) => (
              <th key={key} className={cls || undefined}>
                {sortable ? <SortHeader label={label} sortKey={key} sort={sort} direction={direction} /> : label}
              </th>
            ))}
            <th className="actions-col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => {
            const can = actionsOf(d)
            const locked = d.checked_out_by && d.checked_out_by !== user?.username
            const folder = folderOf(d)
            const hasHistory = (d.version_number || 1) > 1
            const isOpen = expanded.has(d.id)
            return (
              <Fragment key={d.id}>
              <tr id={`doc-${d.id}`} className={highlightId && d.id === highlightId ? 'is-highlight' : undefined}>
                <td>
                  <Link className="doc-name" to={`/documents/${d.id}`}>
                    <FileTypeBadge ext={d.extension} /><span className="truncate">{d.name}</span>
                    {d.checked_out_by && <span className="muted" title={`Checked out by ${d.checked_out_by}`}><Icon name="lock" /></span>}
                  </Link>
                  <LegalHoldBadge item={d} />
                </td>
                <td className="hide-md muted">{typeLabel(d.extension)}</td>
                <td className="num muted nowrap">{filesize(d.size)}</td>
                {!hideFolder && (
                  <td className="hide-md">
                    {d.folder_id
                      ? <Link to={`/folders/${d.folder_id}`} className="muted-link">{folder?.name || 'Folder'}</Link>
                      : <span className="muted">Root</span>}
                  </td>
                )}
                <td className="hide-lg muted nowrap">{dt(d.created_at, 'date')}</td>
                <td className="hide-sm muted nowrap">{dt(d.updated_at)}</td>
                <td>
                  {hasHistory ? (
                    <button type="button" className="badge badge-button" aria-expanded={isOpen}
                      title={isOpen ? 'Hide earlier versions' : 'Show all versions'} onClick={() => toggle(d.id)}>
                      v{d.version || '1.0'} <Icon name="history" />
                    </button>
                  ) : <span className="badge">v{d.version || '1.0'}</span>}
                </td>
                <td className="actions-col">
                  <div className="row-actions">
                    {!d.deleted && <FavouriteButton kind="document" id={d.id} />}
                    {can('item.download') && (
                      <a className="icon-btn" href={contentUrl(d.id)} title="Download document" aria-label="Download document"><Icon name="download" /></a>
                    )}
                    {can('item.share') && (
                      <Link className="icon-btn" to={`/permissions/document/${d.id}`} title="Share" aria-label="Share"><Icon name="share" /></Link>
                    )}
                    <Link className="icon-btn" to={`/documents/${d.id}#versions`} title="Version history" aria-label="Version history"><Icon name="history" /></Link>
                    {!locked && (
                      <>
                        {can('item.version.create') && (
                          <button type="button" className="icon-btn" title="Upload new version" aria-label="Upload new version"
                            onClick={() => open('newVersion', { doc: { id: d.id, name: d.name, extension: d.extension, version: d.version, version_number: d.version_number } })}>
                            <Icon name="upload" />
                          </button>
                        )}
                        {can('item.rename') && (
                          <button type="button" className="icon-btn" title="Rename" aria-label="Rename"
                            onClick={() => open('rename', { kind: 'document', id: d.id, name: d.name })}><Icon name="edit" /></button>
                        )}
                        {can('item.move') && (
                          <button type="button" className="icon-btn" title="Move" aria-label="Move"
                            onClick={() => open('move', { kind: 'document', id: d.id, name: d.name, current: d.folder_id ?? '' })}>
                            <Icon name="move" />
                          </button>
                        )}
                      </>
                    )}
                    {can('item.delete') && !locked && (
                      <ActionButton action={() => deleteDocument(d.id)} className="icon-btn" icon="trash" title="Move to recycle bin"
                        confirm={`Move “${d.name}” to the recycle bin?`} success={`'${d.name}' moved to the recycle bin.`} />
                    )}
                  </div>
                </td>
              </tr>
              {isOpen && (
                <tr className="versions-row">
                  <td colSpan={columns.length + 1}><VersionList doc={d} /></td>
                </tr>
              )}
              </Fragment>
            )
          })}
          {links.map(({ link_id: linkId, document: d }) => (
            <tr key={`link-${linkId}`} id={`link-${linkId}`}>
              <td>
                <Link className="doc-name" to={`/documents/${d.id}`}>
                  <FileTypeBadge ext={d.extension} /><span className="truncate">{d.name}</span>
                  <span className="badge" title={`Shortcut — the document lives in ${folderOf(d)?.path || 'Root'}`}><Icon name="shortcut" /> shortcut</span>
                </Link>
              </td>
              <td className="hide-md muted">{typeLabel(d.extension)}</td>
              <td className="num muted nowrap">{filesize(d.size)}</td>
              {!hideFolder && <td className="hide-md muted">{folderOf(d)?.name || 'Root'}</td>}
              <td className="hide-lg muted nowrap">{dt(d.created_at, 'date')}</td>
              <td className="hide-sm muted nowrap">{dt(d.updated_at)}</td>
              <td><span className="badge">v{d.version || '1.0'}</span></td>
              <td className="actions-col">
                <div className="row-actions">
                  {canDo(d, 'item.download') && (
                    <a className="icon-btn" href={contentUrl(d.id)} title="Download document" aria-label="Download document"><Icon name="download" /></a>
                  )}
                  {canDo(linkFolder, 'folder.upload') && (
                    <ActionButton action={() => removeLink(linkId)} className="icon-btn" icon="trash" title="Remove shortcut"
                      success="Shortcut removed." />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
