import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteVocabulary, saveVocabulary } from '../../api/admin'
import { toast } from '../../lib/toast'

/** admin/_vocab_form.html: add or edit a controlled vocabulary (one value per line). */
export default function VocabForm({ vocab, onDone }) {
  const uid = useId()
  const [v, setV] = useState({ name: vocab?.name || '', description: vocab?.description || '', terms: (vocab?.terms || []).join('\n') })
  const text = (key) => ({ value: v[key], onChange: (e) => setV({ ...v, [key]: e.target.value }) })
  const save = useMutation({
    meta: { inline: true },
    mutationFn: () => saveVocabulary(vocab ? { id: vocab.id, ...v } : v),
    onSuccess: (r) => { toast(`Vocabulary '${r.name}' saved.`, 'success'); onDone?.() },
  })
  const remove = useMutation({
    meta: { inline: true },
    mutationFn: () => deleteVocabulary(vocab.id),
    onSuccess: () => toast('Vocabulary deleted.', 'success'),
  })
  const error = save.error || remove.error
  return (
    <form className="pad" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <div className="field"><label htmlFor={`${uid}-f1`}>Name</label><input id={`${uid}-f1`} type="text" required {...text('name')} /></div>
      <div className="field"><label htmlFor={`${uid}-f2`}>Description</label><input id={`${uid}-f2`} type="text" {...text('description')} /></div>
      <div className="field"><label htmlFor={`${uid}-f3`}>Values (one per line)</label><textarea id={`${uid}-f3`} rows={5} {...text('terms')} /></div>
      {error && <p className="form-error" role="alert">{error.message}</p>}
      <div className="modal-actions">
        {vocab && <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => remove.mutate()} disabled={remove.isPending}>Delete</button>}
        <button className="btn btn-primary btn-sm" type="submit" disabled={save.isPending}>Save vocabulary</button>
      </div>
    </form>
  )
}
