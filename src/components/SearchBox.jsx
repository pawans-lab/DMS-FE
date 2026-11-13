import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAllDocuments, useFolders } from '../hooks/data'
import Icon from './Icon'

/**
 * Topbar search with debounced suggestions (app.js "global search suggestions"). Like
 * /documents/search.json, documents (newest first, 8) and folders (5) whose name contains the text are
 * suggested, from the cached GET /documents and GET /folders lists. Enter opens /search?q= (full text).
 */
export default function SearchBox() {
  const location = useLocation()
  const navigate = useNavigate()
  const formRef = useRef(null)
  const urlQ = ['/search', '/documents'].includes(location.pathname)
    ? new URLSearchParams(location.search).get('q') || '' : ''
  const [q, setQ] = useState(urlQ)
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const { folders, byId } = useFolders()

  // Follow the URL when the page changes (adjusting state during render, not in an effect).
  const urlKey = `${location.pathname}?${urlQ}`
  const [seenKey, setSeenKey] = useState(urlKey)
  if (seenKey !== urlKey) {
    setSeenKey(urlKey)
    setQ(urlQ)
    setOpen(false)
  }
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 180)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    const onClick = (e) => { if (!formRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const enabled = debounced.length >= 2
  const { data } = useAllDocuments(enabled)
  const lower = debounced.toLowerCase()
  const folderHits = enabled ? folders.filter((f) => f.name.toLowerCase().includes(lower)).slice(0, 5) : []
  const docs = enabled
    ? (data || []).filter((d) => d.name.toLowerCase().includes(lower))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
    : []
  const show = open && enabled && !!data
  const close = () => setOpen(false)

  return (
    <form ref={formRef} className="search" role="search" autoComplete="off"
      onSubmit={(e) => { e.preventDefault(); close(); navigate(`/search?q=${encodeURIComponent(q.trim())}`) }}>
      <Icon name="search" />
      <input type="search" name="q" placeholder="Search names, content, emails and metadata…" value={q}
        aria-label="Search" onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onKeyDown={(e) => { if (e.key === 'Escape') close() }} />
      <div className="search-results" hidden={!show}>
        {folderHits.length > 0 && <div className="group">Folders</div>}
        {folderHits.map((f) => (
          <Link key={`f${f.id}`} to={`/folders/${f.id}`} onClick={close}><span>{f.name}</span><small>{f.path}</small></Link>
        ))}
        {docs.length > 0 && <div className="group">Documents</div>}
        {docs.map((d) => (
          <Link key={`d${d.id}`} to={`/documents/${d.id}`} onClick={close}>
            <span>{d.name}</span><small>{byId.get(d.folder_id)?.path || 'Root'}</small>
          </Link>
        ))}
        {!folderHits.length && !docs.length && <div className="group">No name matches — press Enter to search content</div>}
      </div>
    </form>
  )
}
