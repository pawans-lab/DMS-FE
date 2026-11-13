import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { uuid } from '../../api/client'
import { uploadDocuments } from '../../api/documents'
import { useMetadataSchema } from '../../hooks/data'
import { checkTags, filesize } from '../../lib/format'
import { refreshData } from '../../lib/query'
import { toast } from '../../lib/toast'
import Dropzone from '../Dropzone'
import FolderSelect from '../FolderSelect'
import MetadataFields, { TagsField } from '../MetadataFields'
import Modal from '../Modal'

/** "report.pdf" → ["report", ".pdf"] (no extension → ["report", ""]). */
function splitName(name) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
}

/** A suggested new name for a duplicate: "report.pdf" → "report (1).pdf". */
function suggestName(name) {
  const [base, ext] = splitName(name)
  return `${base} (1)${ext}`
}

/**
 * Shown only when an uploaded file has the same name AND exactly the same content as a document already
 * in the folder (a changed file is saved as a new version without asking). Nothing has been stored yet.
 * For each file the user chooses:
 *  - Replace: removes the old identical copy and stores this upload in its place;
 *  - Rename & upload: stores the upload as a separate new document under another name;
 *  - Don't upload (several files only; with one file that is Cancel): leaves everything unchanged.
 */
function DuplicatePrompt({ duplicates, busy, error, onResolve, onCancel }) {
  const [choices, setChoices] = useState(() => Object.fromEntries(duplicates.map((d) => [d.filename, {
    action: d.can_replace ? 'replace' : 'rename', base: splitName(suggestName(d.filename))[0],
  }])))
  const set = (name, patch) => setChoices((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))
  const one = duplicates.length === 1
  const finalName = (d) => `${choices[d.filename].base.trim()}${splitName(d.filename)[1]}`
  const renames = duplicates.filter((d) => choices[d.filename].action === 'rename')
  const replaces = duplicates.filter((d) => choices[d.filename].action === 'replace')
  const invalid = renames.find((d) => !choices[d.filename].base.trim() || finalName(d).toLowerCase() === d.filename.toLowerCase())
  let label = 'Continue'
  if (one) label = renames.length ? 'Rename & upload' : 'Replace'
  if (busy) label = 'Uploading…'

  return (
    <div role="alertdialog" aria-labelledby="dup-title">
      <h3 id="dup-title">{one ? 'This document already exists' : 'These documents already exist'}</h3>
      <p className="muted">
        {one ? 'A document with the same name and exactly the same content is' : 'Documents with the same names and exactly the same content are'}{' '}
        already in this folder. <strong>Replace</strong> removes the existing identical copy and keeps your upload instead
        (other versions are not affected). <strong>Rename &amp; upload</strong> keeps the existing document and stores your
        upload as a separate document under a new name. Cancel leaves everything unchanged.
      </p>
      <ul className="list compact">
        {duplicates.map((d) => {
          const c = choices[d.filename]
          const ext = splitName(d.filename)[1]
          const radio = (value, text, disabled = false) => (
            <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginRight: 12 }}>
              <input type="radio" name={`dup-${d.filename}`} value={value} checked={c.action === value}
                disabled={busy || disabled} onChange={() => set(d.filename, { action: value })} /> {text}
            </label>
          )
          return (
            <li key={d.filename} className="list-row" style={{ display: 'block' }}>
              <strong className="break">{d.filename}</strong>
              <small className="muted" style={{ display: 'block' }}>
                Same as: {d.name}{d.identical_version ? ` · version ${d.identical_version}${d.identical_is_current ? ' (current)' : ''}` : ''}{d.size != null ? ` · ${filesize(d.size)}` : ''}
              </small>
              <div style={{ marginTop: 6 }}>
                {radio('replace', 'Replace', !d.can_replace)}
                {radio('rename', 'Rename & upload')}
                {!one && radio('skip', 'Don’t upload')}
              </div>
              {!d.can_replace && (
                <small className="form-error" style={{ display: 'block' }}>
                  {d.reason || 'You cannot replace this document.'} You can still upload it under a new name.
                </small>
              )}
              {c.action === 'rename' && (
                <div className="field" style={{ marginTop: 6, marginBottom: 0 }}>
                  <label htmlFor={`dup-name-${d.filename}`}>New name</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="text" id={`dup-name-${d.filename}`} value={c.base} disabled={busy} maxLength={250}
                      onChange={(e) => set(d.filename, { base: e.target.value })} style={{ flex: 1 }} />
                    {ext && <span className="muted">{ext}</span>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {invalid && <p className="form-error" role="alert">Enter a new name for ‘{invalid.filename}’ that differs from the existing document.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy || !(renames.length + replaces.length) || !!invalid}
          onClick={() => onResolve({
            replace: replaces.map((d) => d.filename),
            rename: renames.map((d) => ({ filename: d.filename, name: finalName(d) })),
          })}>
          {label}
        </button>
      </div>
    </div>
  )
}

/** A fresh copy of an upload summary (state is never modified in place), with the files not replaced. */
function copySummary(s, kept) {
  return { ...s, added: [...s.added], versioned: [...s.versioned], skipped: [...s.skipped], kept }
}

/** #upload-modal in base.html: one or more files, destination, document type, metadata, tags. */
export default function UploadModal({ onClose, folderId: initialFolderId = '' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState([])
  const [folderId, setFolderId] = useState(initialFolderId == null ? '' : String(initialFolderId))
  const [typeId, setTypeId] = useState('')
  const [idempotencyKey] = useState(uuid)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  // Waiting for the user's decision about same-named documents: { duplicates, fields, summary }
  const [pending, setPending] = useState(null)
  const schema = useMetadataSchema(folderId, typeId).data

  function formData(list, fields, onDuplicate, allowIdentical = false) {
    const data = new FormData()
    list.forEach((f) => data.append('file', f))
    Object.entries(fields).forEach(([k, v]) => data.append(k, v))
    data.append('on_duplicate', onDuplicate)
    // Only after the prompt told the user the file is identical and they still chose Replace.
    if (allowIdentical) data.append('allow_identical', '1')
    return data
  }

  /** Add one upload response to the running summary. */
  function collect(summary, result) {
    if (result.documents) {
      const versionedIds = new Set((result.versioned || []).map((v) => v.document_id))
      result.documents.filter((d) => !versionedIds.has(d.id)).forEach((d) => summary.added.push({ name: d.name, doc: d }))
      ;(result.versioned || []).forEach((v) => summary.versioned.push({
        name: v.name, version: v.version, doc: result.documents.find((d) => d.id === v.document_id),
      }))
      ;(result.errors || []).forEach((x) => summary.skipped.push(`${x.filename}: ${x.error}`))
    } else if (result.document) {
      if (result.versioned) summary.versioned.push({ name: result.document.name, version: result.version, doc: result.document })
      else summary.added.push({ name: result.document.name, doc: result.document })
    }
  }

  /** Summary toast and navigation once everything the user chose has been uploaded. */
  async function finish(summary) {
    await refreshData(queryClient)
    onClose()
    const parts = []
    if (summary.added.length) {
      parts.push(summary.added.length === 1 ? `Uploaded '${summary.added[0].name}'.` : `Uploaded ${summary.added.length} new file(s).`)
    }
    if (summary.versioned.length) {
      parts.push(`New version of ${summary.versioned.map((v) => `${v.name} → v${v.version}`).join(', ')}. Earlier versions are kept.`)
    }
    if (summary.kept.length) parts.push(`Not replaced: ${summary.kept.join(', ')}.`)
    if (summary.skipped.length) parts.push(`Skipped: ${summary.skipped.join('; ')}`)
    const anything = summary.added.length || summary.versioned.length
    toast(parts.join(' ') || 'Nothing was uploaded.', anything ? 'success' : 'info')
    const first = summary.added[0] || summary.versioned[0]
    if (!first) return
    if (summary.single && first.doc) {
      const doc = first.doc
      navigate(doc.folder_id ? `/folders/${doc.folder_id}?highlight=${doc.id}` : `/folders?highlight=${doc.id}`)
    } else {
      navigate(folderId ? `/folders/${folderId}` : '/documents')
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!files.length) { setError('Please choose a file.'); return }
    const form = e.currentTarget
    const tagError = checkTags(form.elements.tags.value, schema?.tags || [], schema?.tags_controlled)
    if (tagError) { setError(tagError); return }
    const fields = { folder_id: folderId, document_type_id: typeId, tags: form.elements.tags.value }
    if (files.length === 1) fields.idempotency_key = idempotencyKey // same key on retry and on Replace
    form.querySelectorAll('[name^="meta_"]').forEach((el) => { fields[el.name] = el.value })
    const summary = { added: [], versioned: [], kept: [], skipped: [], single: files.length === 1 }
    setProgress(0)
    try {
      // Never replace anything without asking: same-named files come back as "duplicates".
      const { data: result } = await uploadDocuments(formData(files, fields, 'ask'), setProgress)
      collect(summary, result)
      if (result.duplicates?.length) {
        setProgress(null)
        setPending({ duplicates: result.duplicates, fields, summary })
        return
      }
      await finish(summary)
    } catch (err) {
      setProgress(null)
      if (err.code === 'duplicate_document' && err.data?.duplicates?.length) {
        ;(err.data.errors || []).forEach((x) => summary.skipped.push(`${x.filename}: ${x.error}`))
        setPending({ duplicates: err.data.duplicates, fields, summary })
        return
      }
      const perFile = (err.data?.errors || []).map((x) => `${x.filename}: ${x.error}`)
      setError(perFile.length ? perFile.join('; ') : err.message)
    }
  }

  /** Carry out the user's choice for each duplicate: replace it, upload it under a new name, or skip it. */
  async function resolve({ replace: replaceNames, rename }) {
    const { duplicates, fields } = pending
    setError('')
    const handled = new Set([...replaceNames, ...rename.map((r) => r.filename)])
    const summary = copySummary(pending.summary, [
      ...pending.summary.kept, ...duplicates.map((d) => d.filename).filter((n) => !handled.has(n)),
    ])
    const fail = (err, prefix, doneNames) => {
      setProgress(null)
      const perFile = (err.data?.errors || []).map((x) => `${x.filename}: ${x.error}`)
      setError(`${prefix}${perFile.length ? perFile.join('; ') : err.message}`)
      // Keep the prompt for what is left; files already uploaded are not offered again.
      setPending({ ...pending, duplicates: duplicates.filter((d) => handled.has(d.filename) && !doneNames.has(d.filename)), summary })
    }
    setProgress(0)
    // Renamed files: one request each, stored only as new documents (on_duplicate=new), so a name that is
    // already taken is refused instead of silently becoming a version of another document. Type, metadata
    // and tags are the ones chosen in the upload form.
    const done = new Set()
    for (const r of rename) {
      const original = files.find((f) => f.name === r.filename)
      const renamed = new File([original], r.name, { type: original.type, lastModified: original.lastModified })
      const renameFields = { ...fields }
      delete renameFields.idempotency_key
      try {
        const { data: result } = await uploadDocuments(formData([renamed], renameFields, 'new'), setProgress)
        collect(summary, result)
        done.add(r.filename)
      } catch (err) {
        fail(err, `${r.name}: `, done)
        return
      }
    }
    if (replaceNames.length) {
      const chosen = files.filter((f) => replaceNames.includes(f.name))
      try {
        // The prompt only lists identical files, so Replace always means "replace the identical copy".
        const { data: result } = await uploadDocuments(formData(chosen, fields, 'replace', true), setProgress)
        collect(summary, result)
      } catch (err) {
        fail(err, '', done)
        return
      }
    }
    await finish(summary)
  }

  async function cancelReplace() {
    const summary = copySummary(pending.summary, [...pending.summary.kept, ...pending.duplicates.map((d) => d.filename)])
    if (summary.added.length || summary.versioned.length || summary.skipped.length) {
      await finish(summary) // other files in the batch were uploaded
    } else {
      toast('Upload cancelled. The existing document was not changed.', 'info')
      onClose()
    }
  }

  if (pending) {
    return (
      <Modal title="Same document already exists" onClose={cancelReplace} small>
        <DuplicatePrompt key={pending.duplicates.map((d) => d.filename).join('|')} duplicates={pending.duplicates}
          busy={progress !== null} error={error} onResolve={resolve} onCancel={cancelReplace} />
        {progress !== null && <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>}
      </Modal>
    )
  }

  return (
    <Modal title="Upload Document" onClose={onClose}>
      <form onSubmit={submit} encType="multipart/form-data">
        <Dropzone files={files} onFiles={setFiles} multiple required title="Drop files here or click to browse"
          hint="Office, PDF, images, CAD, audio, video, text and archives" />
        <div className="field">
          <label htmlFor="upload-folder">Destination folder</label>
          <FolderSelect id="upload-folder" value={folderId} onChange={setFolderId} needEdit />
        </div>
        <div className="field">
          <label htmlFor="upload-type">Document type</label>
          <select id="upload-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">(none)</option>
            {(schema?.types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <MetadataFields fields={schema?.fields} />
        <TagsField id="upload-tags" tags={schema?.tags} controlled={schema?.tags_controlled} />
        <p className="small muted">
          A new file name creates a new document (version 1.0). A changed file with the same name as a document in
          the folder is saved as its next version (1.1, 1.2, …) and every earlier version is kept. If the file is
          exactly the same as the existing one, you are asked whether to replace it, upload it under a new name, or cancel. Files are scanned for
          malware before they are stored.
        </p>
        {progress !== null && <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={progress !== null}>Upload</button>
        </div>
      </form>
    </Modal>
  )
}
