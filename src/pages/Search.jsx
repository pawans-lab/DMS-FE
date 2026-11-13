import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getMetadata } from '../api/admin'
import { directory } from '../api/documents'
import { search } from '../api/search'
import { useAuth } from '../auth/authContext'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import SafeMarkup from '../components/SafeMarkup'
import EmptyState from '../components/EmptyState'
import FileTypeBadge from '../components/FileTypeBadge'
import Pagination from '../components/Pagination'
import { useFolders, useMetadataSchema, useTitle } from '../hooks/data'
import { TYPE_OPTIONS, dt, filesize, plural } from '../lib/format'

const PER_PAGE = 20
const FILTER_KEYS = ['kind', 'type', 'folder', 'tag', 'doctype', 'author', 'from', 'to', 'size_min', 'size_max', 'value']
const FACET_LABELS = { kind: 'Content', type: 'Type', folder: 'Folder', tag: 'Tag', doctype: 'Document type', year: 'Year' }

/** URL parameters of search.html → GET /api/v1/search parameters. */
function apiParams(p, page) {
  return {
    q: p.get('q') || '', kind: p.get('kind') || '', type: p.getAll('type'), folder_id: p.get('folder') || '',
    include_subfolders: p.get('sub') === '0' ? '0' : '1', tag: p.getAll('tag'), document_type_id: p.get('doctype') || '',
    author_id: p.get('author') || '', date_field: p.get('datefield') || '', date_from: p.get('from') || '',
    date_to: p.get('to') || '', size_min: p.get('size_min') || '', size_max: p.get('size_max') || '',
    size_unit: p.get('size_unit') || 'mb', meta_field_id: p.get('field') || '', meta_value: p.get('value') || '',
    sort: p.get('sort') || 'relevance', page, per_page: PER_PAGE,
  }
}

/** search.html: full-text search with syntax help, advanced filters, facets and highlighted snippets. */
export default function Search() {
  useTitle('Search')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { has } = useAuth()
  const { tree, byId } = useFolders()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const searched = !!(params.get('q') || '').trim() || FILTER_KEYS.some((k) => params.get(k))
  const advancedOpen = FILTER_KEYS.some((k) => params.get(k))
  const schema = useMetadataSchema('', '').data
  const authors = useQuery({ queryKey: ['directory', ''], queryFn: () => directory('') })
  const fields = useQuery({ queryKey: ['admin-metadata'], queryFn: getMetadata, enabled: has('admin') })
  const results = useQuery({
    queryKey: ['search', params.toString()],
    queryFn: () => search(apiParams(params, page)),
    enabled: searched,
  })
  const data = results.data
  const total = data?.total || 0
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const typeOptions = [...new Set([...TYPE_OPTIONS, 'Email'])].sort()

  function submit(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    for (const [key, value] of new FormData(e.currentTarget)) if (value !== '') next.append(key, value)
    if (!next.has('sub')) next.set('sub', '0')
    if (next.get('sub') === '1') next.delete('sub')
    navigate(`/search?${next}`)
  }

  const facetLink = (group, key) => {
    const a = new URLSearchParams(params)
    a.set('page', '1')
    if (group === 'kind') a.set('kind', key === 'Documents' ? 'document' : 'email')
    else if (group === 'type') a.set('type', key)
    else if (group === 'folder') a.set('folder', key[0] || '')
    else if (group === 'tag') a.set('tag', key)
    else if (group === 'doctype') a.set('doctype', key[0])
    else { a.set('from', `${key}-01-01`); a.set('to', `${key}-12-31`) }
    return `/search?${a}`
  }
  const facetText = (group, key) => (group === 'folder' || group === 'doctype' ? key[1] : key)

  return (
    <>
      <div className="page-head">
        <div><h1>Search</h1>
          <p className="muted">{searched ? plural(total, 'result') : 'Full-text search across document content, archived emails, attachments and metadata.'}</p></div>
      </div>

      <form className="card search-form" onSubmit={submit} key={params.toString()}>
        <div className="filters">
          <div className="field grow"><label htmlFor="sq">Search for</label>
            <input type="search" id="sq" name="q" defaultValue={params.get('q') || ''} placeholder='budget AND "annual report" NOT draft*' autoFocus /></div>
          <div className="field"><label htmlFor="ssort">Sort by</label>
            <select id="ssort" name="sort" defaultValue={params.get('sort') || 'relevance'}>
              <option value="relevance">Relevance</option><option value="date">Newest</option><option value="name">Name</option><option value="size">Largest</option>
            </select></div>
          <div className="field field-actions"><button className="btn btn-primary" type="submit"><Icon name="search" /> Search</button></div>
        </div>
        <details className="help"><summary>Search syntax</summary>
          <ul>
            <li><code>budget report</code> — both words · <code>budget OR forecast</code> — either · <code>budget NOT draft</code> or <code>-draft</code> — exclude</li>
            <li><code>&quot;annual budget&quot;</code> — exact phrase · <code>(a OR b) AND c</code> — grouping</li>
            <li><code>budg*</code>, <code>b?dget</code>, <code>*port</code> — wildcards · <code>budgit~</code> / <code>budgit~2</code> — fuzzy (typo-tolerant)</li>
            <li><code>name:invoice</code>, <code>body:clause</code>, <code>meta:approved</code> — search only the name/subject, the content or the metadata &amp; tags</li>
          </ul>
        </details>
        <details className="help" open={advancedOpen}>
          <summary>Advanced filters</summary>
          <div className="filters">
            <div className="field"><label htmlFor="skind">Content</label>
              <select id="skind" name="kind" defaultValue={params.get('kind') || ''}>
                <option value="">Documents and emails</option><option value="document">Documents only</option>
                <option value="email">Emails only</option>
              </select></div>
            <div className="field"><label htmlFor="stype">Type</label>
              <select id="stype" name="type" defaultValue={params.get('type') || ''}>
                <option value="">Any type</option>{typeOptions.map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div className="field"><label htmlFor="sfolder">Folder</label>
              <select id="sfolder" name="folder" defaultValue={params.get('folder') || ''}>
                <option value="">Anywhere</option>
                {tree.map(({ folder: f, depth }) => <option key={f.id} value={f.id}>{'  '.repeat(depth)}{f.name}</option>)}
              </select>
              <label className="check"><input type="checkbox" name="sub" value="1" defaultChecked={params.get('sub') !== '0'} /> Include subfolders</label></div>
            <div className="field"><label htmlFor="stag">Tag</label>
              <select id="stag" name="tag" defaultValue={params.get('tag') || ''}>
                <option value="">Any tag</option>{(schema?.tags || []).map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div className="field"><label htmlFor="sdt">Document type</label>
              <select id="sdt" name="doctype" defaultValue={params.get('doctype') || ''}>
                <option value="">Any</option>{(schema?.types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <div className="field"><label htmlFor="sauthor">Author</label>
              <select id="sauthor" name="author" defaultValue={params.get('author') || ''}>
                <option value="">Anyone</option>{(authors.data?.users || []).map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select></div>
          </div>
          <div className="filters">
            <div className="field"><label htmlFor="sdf">Date</label>
              <select id="sdf" name="datefield" defaultValue={params.get('datefield') || 'modified'}>
                <option value="modified">Modified / received</option><option value="created">Created</option>
              </select></div>
            <div className="field"><label htmlFor="sfrom">From</label><input type="date" id="sfrom" name="from" defaultValue={params.get('from') || ''} /></div>
            <div className="field"><label htmlFor="sto">To</label><input type="date" id="sto" name="to" defaultValue={params.get('to') || ''} /></div>
            <div className="field"><label htmlFor="smin">Size from</label><input type="text" id="smin" name="size_min" defaultValue={params.get('size_min') || ''} inputMode="decimal" size={6} /></div>
            <div className="field"><label htmlFor="smax">to</label><input type="text" id="smax" name="size_max" defaultValue={params.get('size_max') || ''} inputMode="decimal" size={6} /></div>
            <div className="field"><label htmlFor="sunit">Unit</label>
              <select id="sunit" name="size_unit" defaultValue={params.get('size_unit') || 'mb'}>
                {['kb', 'mb', 'gb'].map((u) => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select></div>
          </div>
          <div className="filters">
            {has('admin') && (
              <div className="field"><label htmlFor="sfield">Metadata field</label>
                <select id="sfield" name="field" defaultValue={params.get('field') || ''}>
                  <option value="">—</option>{(fields.data?.fields || []).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select></div>
            )}
            <div className="field grow"><label htmlFor="svalue">{has('admin') ? 'contains' : 'Metadata contains'}</label>
              <input type="text" id="svalue" name="value" defaultValue={params.get('value') || ''} /></div>
            <div className="field field-actions"><Link className="btn btn-ghost" to="/search">Reset</Link></div>
          </div>
        </details>
      </form>

      {searched && results.isError && <QueryError error={results.error} />}
      {searched && results.isPending && <Loading text="Searching…" />}
      {searched && data && (
        <div className="browse-grid">
          <aside className="card tree-card facets">
            {Object.keys(FACET_LABELS).map((group) => (data.facets[group]?.length ? (
              <div key={group}>
                <h2 className="small-head">{FACET_LABELS[group]}</h2>
                <ul className="tree">
                  {data.facets[group].slice(0, 10).map(([key, n]) => (
                    <li key={JSON.stringify(key)}><Link to={facetLink(group, key)}><span className="truncate">{facetText(group, key)}</span><small className="muted">{n}</small></Link></li>
                  ))}
                </ul>
              </div>
            ) : null))}
          </aside>
          <div>
            {data.results.length ? (
              <>
                <ul className="card search-hits">
                  {data.results.map((h) => (
                    <li className="hit" key={`${h.kind}${h.id}`}>
                      {h.kind === 'document' ? (
                        <>
                          <Link className="hit-title" to={`/documents/${h.id}`}><FileTypeBadge ext={h.document.extension} /><span>{h.title}</span></Link>
                          <div className="small muted">
                            {byId.get(h.document.folder_id)?.path || 'Root'} · {h.type} · {filesize(h.size)} · v{h.document.version} · modified {dt(h.document.updated_at)}
                            {h.document.author && ` · ${h.document.author}`}
                            {h.document.tags.map((t) => <span key={t}> <span className="badge">{t}</span></span>)}
                          </div>
                        </>
                      ) : (
                        <>
                          <Link className="hit-title" to={`/emails/${h.id}`}><span className="ft ft-txt">MAIL</span><span>{h.title || '(no subject)'}</span></Link>
                          <div className="small muted">{h.email.sender} · {dt(h.email.received_at)}{h.email.attachment_count > 0 && ` · ${h.email.attachment_count} attachment(s)`}</div>
                        </>
                      )}
                      {h.snippet && <p className="hit-snippet"><SafeMarkup html={h.snippet} /></p>}
                    </li>
                  ))}
                </ul>
                <Pagination page={page} pages={pages} />
              </>
            ) : (
              <div className="card"><EmptyState title="No results" text="Try fewer words, a wildcard (budg*) or a fuzzy term (budgit~)." icon="search" /></div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
