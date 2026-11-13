import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { folderZipUrl } from '../../api/folders'
import DocumentTable from '../../components/DocumentTable'
import Icon from '../../components/Icon'
import Loading, { QueryError } from '../../components/Loading'
import { useModals } from '../../components/modals/modalContext'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import { useAllDocuments, useFolders, useTitle } from '../../hooks/data'
import { TYPE_LABELS, TYPE_OPTIONS, plural } from '../../lib/format'

const PAGE_SIZE = 25
const SORTS = ['name', 'type', 'size', 'folder', 'uploaded', 'modified', 'version']

/**
 * documents/index.html. GET /documents cannot filter, sort or page (MIGRATION.md G3), so the
 * same rules as routes/documents.py index() are applied here to the full list.
 */
export default function DocumentsIndex() {
  useTitle('All Documents')
  const [params, setParams] = useSearchParams()
  const { open } = useModals()
  const { tree, byId } = useFolders()
  const docs = useAllDocuments()
  const filters = {
    q: (params.get('q') || '').trim(), type: params.get('type') || '', folder: params.get('folder') || '',
    tag: (params.get('tag') || '').trim(), from: params.get('from') || '', to: params.get('to') || '',
  }
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : 'modified'
  const direction = params.get('dir') === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filtered = Object.values(filters).some(Boolean)
  const [form, setForm] = useState(filters)
  const formKey = params.toString()
  const [lastKey, setLastKey] = useState(formKey)
  if (formKey !== lastKey) { setLastKey(formKey); setForm(filters) }

  const rows = (() => {
    let list = docs.data || []
    const { q, type, folder, tag, from, to } = filters
    if (q) list = list.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    if (type) {
      const exts = Object.entries(TYPE_LABELS).filter(([, l]) => l === type).map(([e]) => e)
      const allowed = exts.length ? exts : [type.toLowerCase()]
      list = list.filter((d) => allowed.includes(d.extension))
    }
    if (folder === 'root') list = list.filter((d) => d.folder_id == null)
    else if (/^\d+$/.test(folder)) list = list.filter((d) => d.folder_id === Number(folder))
    if (tag) list = list.filter((d) => d.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
    if (from) list = list.filter((d) => new Date(d.created_at) >= new Date(`${from}T00:00:00Z`))
    if (to) list = list.filter((d) => new Date(d.created_at) < new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000))
    const key = {
      name: (d) => d.name.toLowerCase(), type: (d) => d.extension || '', size: (d) => d.size || 0,
      folder: (d) => (byId.get(d.folder_id)?.name || '').toLowerCase(), uploaded: (d) => d.created_at,
      modified: (d) => d.updated_at, version: (d) => d.version_number || 0,
    }[sort]
    const sign = direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const ka = key(a)
      const kb = key(b)
      if (ka < kb) return -sign
      if (ka > kb) return sign
      return b.id - a.id
    })
  })()

  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const highlightId = Number(params.get('highlight')) || 0

  function apply(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    Object.entries(form).forEach(([k, v]) => { if (v) next.set(k, v) })
    next.set('sort', sort)
    next.set('dir', direction)
    setParams(next)
  }
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <>
      <div className="page-head">
        <div>
          <h1>All Documents</h1>
          <p className="muted">{plural(total, 'document')}{filtered && ' matching your filters'}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => open('upload')}><Icon name="upload" /> Upload Document</button>
          <a className="btn btn-ghost" href={folderZipUrl(null)} title="Download every document in the library, with its folder structure">
            <Icon name="download" /> Download library (ZIP)
          </a>
        </div>
      </div>

      <form className="filters card" onSubmit={apply}>
        <div className="field grow">
          <label htmlFor="f-q">Search</label>
          <input type="search" id="f-q" value={form.q} onChange={set('q')} placeholder="Document name" />
        </div>
        <div className="field">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={form.type} onChange={set('type')}>
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-folder">Folder</label>
          <select id="f-folder" value={form.folder} onChange={set('folder')}>
            <option value="">All folders</option>
            <option value="root">Root</option>
            {tree.map(({ folder: f, depth }) => <option key={f.id} value={f.id}>{'  '.repeat(depth)}{f.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from">Uploaded from</label>
          <input type="date" id="f-from" value={form.from} onChange={set('from')} />
        </div>
        <div className="field">
          <label htmlFor="f-to">to</label>
          <input type="date" id="f-to" value={form.to} onChange={set('to')} />
        </div>
        <div className="field field-actions">
          <button className="btn btn-secondary" type="submit">Apply</button>
          <Link className="btn btn-ghost" to="/documents">Reset</Link>
        </div>
      </form>

      {docs.isPending ? <Loading /> : docs.isError ? <QueryError error={docs.error} /> : shown.length ? (
        <>
          <div className="card card-flush">
            <DocumentTable documents={shown} sortable sort={sort} direction={direction} highlightId={highlightId} />
          </div>
          <Pagination page={page} pages={pages} />
        </>
      ) : (
        <div className="card">
          {filtered ? (
            <EmptyState title="No matching documents" text="Try a different search term or clear the filters." icon="search">
              <Link className="btn btn-ghost btn-sm" to="/documents">Clear filters</Link>
            </EmptyState>
          ) : (
            <EmptyState title="No documents yet" text="Use the Upload Document button above to add PDFs, Office files, images and more." icon="file" />
          )}
        </div>
      )}
    </>
  )
}
