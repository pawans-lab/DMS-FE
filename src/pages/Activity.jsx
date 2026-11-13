import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { activity } from '../api/admin'
import Loading, { QueryError } from '../components/Loading'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { useTitle } from '../hooks/data'
import { dt } from '../lib/format'

const PER_PAGE = 50
const FILTERS = ['q', 'category', 'date_from', 'date_to']

function show(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Before → after values recorded with an audit entry (renames, moves, properties, permissions…). */
function Changes({ changes }) {
  const rows = Object.entries(changes || {})
  if (!rows.length) return null
  return (
    <ul className="muted" style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '.85rem' }}>
      {rows.map(([field, c]) => (
        <li key={field} style={{ display: 'list-item', padding: 0, border: 0 }}>
          {field.replace(/_/g, ' ')}: <del>{show(c?.old)}</del> → <strong>{show(c?.new)}</strong>
        </li>
      ))}
    </ul>
  )
}

/** activity.html → GET /api/v1/activity: the signed-in user's own audit trail (the server only returns their entries). */
export default function Activity() {
  useTitle('My Activity Log')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filters = Object.fromEntries(FILTERS.map((k) => [k, (params.get(k) || '').trim()]))
  const [form, setForm] = useState(filters)
  const query = useQuery({
    queryKey: ['activity', page, PER_PAGE, filters],
    queryFn: () => activity(page, PER_PAGE, filters),
  })
  const events = query.data?.events || []
  const categories = [...new Set([...(query.data?.categories || []), filters.category].filter(Boolean))].sort()
  const pages = Math.max(1, Math.ceil((query.data?.total || 0) / PER_PAGE))

  function submit(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    FILTERS.forEach((k) => { if (form[k]) next.set(k, form[k]) })
    setParams(next)
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })

  return (
    <>
      <div className="page-head"><div><h1>My Activity Log</h1><p className="muted">Everything you did and when: documents, folders, sharing, sign-ins and your email archive. Only your own activity is shown. Entries cannot be changed or deleted.</p></div></div>
      <form className="filters card" onSubmit={submit}>
        <div className="field grow"><label htmlFor="aq">Search</label>
          <input type="search" id="aq" {...field('q')} placeholder="Text or item name" /></div>
        <div className="field"><label htmlFor="acat">Category</label>
          <select id="acat" {...field('category')}>
            <option value="">All</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div className="field"><label htmlFor="afrom">From</label><input type="date" id="afrom" {...field('date_from')} /></div>
        <div className="field"><label htmlFor="ato">To</label><input type="date" id="ato" {...field('date_to')} /></div>
        <div className="field field-actions"><button className="btn btn-secondary" type="submit">Filter</button></div>
      </form>
      {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : events.length ? (
        <>
          <div className="card">
            <ul className="timeline">
              {events.map((a) => {
                const isDoc = (a.entity_type || a.category) === 'document'
                let text = a.message
                if (a.entity_id && isDoc && a.action !== 'purged') text = <Link to={`/documents/${a.entity_id}`}>{a.message}</Link>
                return (
                  <li key={a.id}><span className={`tl-dot tl-${a.category}`} />
                    <span className="tl-text">{text} <small className="muted">· {a.category} · {a.action}{a.ip ? ` · ${a.ip}` : ''}</small>
                      <Changes changes={a.details?.changes} /></span>
                    <small className="muted nowrap">{dt(a.created_at)}</small></li>
                )
              })}
            </ul>
          </div>
          <Pagination page={page} pages={pages} />
        </>
      ) : (
        <>
          <div className="card"><EmptyState title="No activity found" icon="activity" /></div>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  )
}
