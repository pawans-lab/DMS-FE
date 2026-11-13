import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { compareVersions, getDocument } from '../../api/documents'
import Loading, { QueryError } from '../../components/Loading'
import SafeMarkup from '../../components/SafeMarkup'
import FileTypeBadge from '../../components/FileTypeBadge'
import { useTitle } from '../../hooks/data'
import { dt } from '../../lib/format'

/** documents/compare.html: side-by-side table or redline of two versions. */
export default function Compare() {
  const { id } = useParams()
  const docId = Number(id)
  const [params, setParams] = useSearchParams()
  const a = params.get('a') || ''
  const b = params.get('b') || ''
  const mode = params.get('mode') === 'redline' ? 'redline' : 'side'
  const doc = useQuery({ queryKey: ['document', docId], queryFn: () => getDocument(docId) })
  const result = useQuery({ queryKey: ['compare', docId, a, b], queryFn: () => compareVersions(docId, a, b) })
  const [form, setForm] = useState(null)
  useTitle(doc.data ? `Compare · ${doc.data.document.name}` : 'Compare')

  if (doc.isPending || result.isPending) return <Loading />
  if (doc.isError) return <QueryError error={doc.error} />
  const d = doc.data.document
  const versions = doc.data.versions
  const back = <nav className="breadcrumbs"><Link to={`/documents/${d.id}#versions`}>← {d.name}</Link></nav>
  if (result.isError) return <>{back}<QueryError error={result.error} /></>

  const r = result.data
  const va = r.a
  const vb = r.b
  const current = form || { a: String(va.number), b: String(vb.number), mode }
  const set = (key) => (e) => setForm({ ...current, [key]: e.target.value })
  const option = (v) => <option key={v.number} value={v.number}>v{v.label} · {dt(v.created_at, 'compact')}</option>

  return (
    <>
      {back}
      <div className="page-head">
        <div className="title-row"><FileTypeBadge ext={d.extension} /><div><h1>Compare versions</h1>
          <p className="muted">{r.stats.added} line(s) added · {r.stats.removed} removed · {r.stats.changed} changed</p></div></div>
      </div>

      <form className="filters card" onSubmit={(e) => { e.preventDefault(); setForm(null); setParams(current) }}>
        <div className="field"><label htmlFor="ca">Older</label><select id="ca" value={current.a} onChange={set('a')}>{versions.map(option)}</select></div>
        <div className="field"><label htmlFor="cb">Newer</label><select id="cb" value={current.b} onChange={set('b')}>{versions.map(option)}</select></div>
        <div className="field"><label htmlFor="cm">View</label>
          <select id="cm" value={current.mode} onChange={set('mode')}>
            <option value="side">Side by side</option><option value="redline">Redline</option>
          </select></div>
        <div className="field field-actions"><button className="btn btn-secondary" type="submit">Compare</button></div>
      </form>

      {r.empty ? (
        <div className="card"><p className="muted">No text could be extracted from these versions (for example a scanned PDF). Download both versions to compare them.</p></div>
      ) : r.identical ? (
        <div className="card"><p>The text of v{va.label} and v{vb.label} is identical{va.sha256 !== vb.sha256 && ' (the files differ only in formatting or embedded data)'}.</p></div>
      ) : mode === 'redline' ? (
        <section className="card diff-redline">
          {r.redline.map((row, i) => (row.kind === 'skip'
            ? <div key={i} className="diff-skip">… {row.count} unchanged line(s) …</div>
            : <div key={i} className={`diff-line diff-${row.kind}`}>{row.html ? <SafeMarkup html={row.html} /> : ' '}</div>))}
        </section>
      ) : (
        <section className="card card-flush"><div className="table-wrap"><table className="table diff-table">
          <thead><tr><th className="num">#</th><th>v{va.label} · {dt(va.created_at)}</th><th className="num">#</th><th>v{vb.label} · {dt(vb.created_at)}</th></tr></thead>
          <tbody>
            {r.rows.map((row, i) => (row.kind === 'skip'
              ? <tr key={i} className="diff-skip"><td colSpan={4}>… {row.count} unchanged line(s) …</td></tr>
              : <tr key={i} className={`diff-${row.kind}`}>
                <td className="num muted">{row.ln}</td><td className="diff-left"><SafeMarkup html={row.left} /></td>
                <td className="num muted">{row.rn}</td><td className="diff-right"><SafeMarkup html={row.right} /></td>
              </tr>))}
          </tbody>
        </table></div></section>
      )}
    </>
  )
}
