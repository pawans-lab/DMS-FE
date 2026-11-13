import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addTags, deleteTag, deleteType, getMetadata, getSettings, saveType } from '../../api/admin'
import ActionButton from '../../components/ActionButton'
import AdminNav from '../../components/AdminNav'
import Loading, { QueryError } from '../../components/Loading'
import { useFolders, useTitle } from '../../hooks/data'
import { FIELD_TYPES } from '../../lib/format'
import { toast } from '../../lib/toast'
import FieldForm from './FieldForm'
import VocabForm from './VocabForm'

/** admin/metadata.html (+ _field_form.html, _vocab_form.html). */
export default function Metadata() {
  useTitle('Metadata & tags')
  const query = useQuery({ queryKey: ['admin-metadata'], queryFn: getMetadata })
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getSettings })
  const { tree, byId } = useFolders()
  const [type, setType] = useState({ name: '', description: '' })
  const [tagNames, setTagNames] = useState('')
  const typeMutation = useMutation({
    mutationFn: () => saveType(type),
    onSuccess: (r) => { toast(`Document type '${r.name}' saved.`, 'success'); setType({ name: '', description: '' }) },
  })
  const tagMutation = useMutation({
    mutationFn: () => addTags(tagNames),
    onSuccess: (r) => { toast(`${r.tags.length} tag(s) saved.`, 'success'); setTagNames('') },
  })

  if (query.isPending) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  const { types, fields, vocabularies, tags } = query.data
  const typeName = (id) => types.find((t) => t.id === id)?.name
  const vocabName = (id) => vocabularies.find((v) => v.id === id)?.name
  const controlled = settings.data?.tags_controlled
  const formProps = { types, vocabularies, tree }

  return (
    <>
      <div className="page-head"><div><h1>Metadata &amp; tags</h1><p className="muted">Document types, custom fields, controlled vocabularies and approved tags.</p></div></div>
      <AdminNav />
      <div className="grid-2">
        <section className="card">
          <h2>Custom fields</h2>
          <p className="small muted">A field applies to all documents, to one document type, to a folder (and its subfolders), or to a type within a folder. Required fields must be filled in at upload.</p>
          <ul className="list compact">
            {fields.length ? fields.map((f) => (
              <li key={f.id}><details>
                <summary className="list-row"><span className="list-main">
                  <span>{f.label} <code>{f.name}</code>{f.required && <> <span className="badge badge-warn">required</span></>}</span>
                  <small className="muted">{FIELD_TYPES[f.field_type]}{f.vocabulary_id && ` · ${vocabName(f.vocabulary_id)}`} · {typeName(f.document_type_id) || 'all types'} · {f.folder_id ? byId.get(f.folder_id)?.path || 'a folder' : 'all folders'}</small>
                </span></summary>
                <FieldForm field={f} {...formProps} />
              </details></li>
            )) : <li className="muted">No custom fields yet.</li>}
          </ul>
          <details><summary className="btn btn-secondary btn-sm">Add field</summary><FieldForm key={fields.length} {...formProps} /></details>
        </section>

        <section className="card">
          <h2>Document types</h2>
          <ul className="list compact">
            {types.length ? types.map((t) => (
              <li key={t.id} className="list-row"><span className="list-main"><span>{t.name}</span><small className="muted">{t.description}</small></span>
                <ActionButton action={() => deleteType(t.id)} label="Delete" className="btn btn-ghost btn-xs btn-danger-text"
                  confirm={`Delete the document type “${t.name}”? Its type-specific fields are deleted too.`} success="Document type deleted." />
              </li>
            )) : <li className="muted">No document types yet.</li>}
          </ul>
          <form className="filters" onSubmit={(e) => { e.preventDefault(); typeMutation.mutate() }}>
            <div className="field grow"><label htmlFor="t-name">Name</label>
              <input type="text" id="t-name" required placeholder="Contract" value={type.name} onChange={(e) => setType({ ...type, name: e.target.value })} /></div>
            <div className="field grow"><label htmlFor="t-desc">Description</label>
              <input type="text" id="t-desc" value={type.description} onChange={(e) => setType({ ...type, description: e.target.value })} /></div>
            <div className="field field-actions"><button className="btn btn-secondary" type="submit" disabled={typeMutation.isPending}>Add type</button></div>
          </form>
        </section>

        <section className="card">
          <h2>Controlled vocabularies</h2>
          {vocabularies.length ? vocabularies.map((v) => (
            <details key={v.id}>
              <summary className="list-row"><span className="list-main"><span>{v.name}</span><small className="muted">{v.terms.length} value(s)</small></span></summary>
              <VocabForm vocab={v} />
            </details>
          )) : <p className="muted">No vocabularies yet.</p>}
          <details><summary className="btn btn-secondary btn-sm">Add vocabulary</summary><VocabForm key={vocabularies.length} /></details>
        </section>

        <section className="card">
          <h2>Approved tags</h2>
          <p className="small muted">{controlled
            ? <>Tags are <strong>controlled</strong>: users can only choose from this list.</>
            : 'Users can create new tags freely. Turn on controlled tags in Settings to restrict them to this list.'}</p>
          <div style={{ margin: '14px 0' }}>{tags.length ? tags.map((t) => (
            <span key={t.id}><span className="badge">{t.name}
              <ActionButton action={() => deleteTag(t.id)} label="×" className="toast-close" title={`Delete tag ${t.name}`} success="Tag deleted." />
            </span> </span>
          )) : <span className="muted">No tags yet.</span>}</div>
          <form className="filters" onSubmit={(e) => { e.preventDefault(); tagMutation.mutate() }}>
            <div className="field grow"><label htmlFor="tg">Add tags</label>
              <input type="text" id="tg" placeholder="Comma-separated" required value={tagNames} onChange={(e) => setTagNames(e.target.value)} /></div>
            <div className="field field-actions"><button className="btn btn-secondary" type="submit" disabled={tagMutation.isPending}>Add</button></div>
          </form>
        </section>
      </div>
    </>
  )
}
