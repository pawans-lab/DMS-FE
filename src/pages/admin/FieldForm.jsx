import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteField, saveField } from '../../api/admin'
import { FIELD_TYPES } from '../../lib/format'
import { toast } from '../../lib/toast'

/** admin/_field_form.html: add or edit a custom metadata field. */
export default function FieldForm({ field, types, vocabularies, tree, onDone }) {
  const uid = useId()
  const [f, setF] = useState({
    label: field?.label || '', name: field?.name || '', field_type: field?.field_type || 'text',
    vocabulary_id: field?.vocabulary_id ?? '', document_type_id: field?.document_type_id ?? '',
    folder_id: field?.folder_id ?? '', help_text: field?.help_text || '', sort_order: field?.sort_order ?? 0,
    required: !!field?.required,
  })
  const text = (key) => ({ value: f[key] ?? '', onChange: (e) => setF({ ...f, [key]: e.target.value }) })
  const save = useMutation({
    meta: { inline: true },
    mutationFn: () => saveField(field ? { id: field.id, ...f } : f),
    onSuccess: (r) => { toast(`Field '${r.label}' saved.`, 'success'); onDone?.() },
  })
  const remove = useMutation({
    meta: { inline: true },
    mutationFn: () => deleteField(field.id),
    onSuccess: () => toast('Field deleted.', 'success'),
  })
  const error = save.error || remove.error
  return (
    <form className="pad" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <div className="field"><label htmlFor={`${uid}-f1`}>Label</label><input id={`${uid}-f1`} type="text" required {...text('label')} /></div>
      <div className="field"><label htmlFor={`${uid}-f2`}>Key</label><input id={`${uid}-f2`} type="text" required pattern="[a-z][a-z0-9_]*" placeholder="contract_number" {...text('name')} /></div>
      <div className="field"><label htmlFor={`${uid}-f3`}>Type</label><select id={`${uid}-f3`} {...text('field_type')}>{Object.entries(FIELD_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="field"><label htmlFor={`${uid}-f4`}>Vocabulary (choice fields)</label><select id={`${uid}-f4`} {...text('vocabulary_id')}><option value="">—</option>{vocabularies.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
      <div className="field"><label htmlFor={`${uid}-f5`}>Document type</label><select id={`${uid}-f5`} {...text('document_type_id')}><option value="">All types</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div className="field"><label htmlFor={`${uid}-f6`}>Folder</label><select id={`${uid}-f6`} {...text('folder_id')}><option value="">All folders</option>{tree.map(({ folder, depth }) => <option key={folder.id} value={folder.id}>{'  '.repeat(depth)}{folder.name}</option>)}</select></div>
      <div className="field"><label htmlFor={`${uid}-f7`}>Help text</label><input id={`${uid}-f7`} type="text" {...text('help_text')} /></div>
      <div className="field"><label htmlFor={`${uid}-f8`}>Order</label><input id={`${uid}-f8`} type="text" inputMode="numeric" {...text('sort_order')} /></div>
      <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} /> Required at upload</label>
      {error && <p className="form-error" role="alert">{error.message}</p>}
      <div className="modal-actions">
        {field && <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => remove.mutate()} disabled={remove.isPending}>Delete</button>}
        <button className="btn btn-primary btn-sm" type="submit" disabled={save.isPending}>Save field</button>
      </div>
    </form>
  )
}
