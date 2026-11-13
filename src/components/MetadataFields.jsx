import { useId } from 'react'

/**
 * Port of fieldInput() in app.js. Inputs are uncontrolled and named meta_<field id>, so the
 * enclosing form's FormData carries them; a value survives a schema reload while its field stays.
 * `values` maps field id → initial value.
 */
export default function MetadataFields({ fields = [], values = {} }) {
  const uid = useId()
  return (
    <div data-metadata-fields>
      {fields.map((f) => {
        const id = `meta-${f.id}-${uid}`
        const initial = values[String(f.id)] ?? ''
        let input
        if (f.type === 'choice' || f.type === 'boolean') {
          const choices = f.type === 'boolean' ? [['yes', 'Yes'], ['no', 'No']] : f.choices.map((c) => [c, c])
          input = (
            <select id={id} name={`meta_${f.id}`} defaultValue={initial} required={f.required && f.type !== 'boolean'}>
              <option value="" />
              {choices.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          )
        } else {
          input = (
            <input type={f.type === 'date' ? 'date' : 'text'} id={id} name={`meta_${f.id}`} defaultValue={initial}
              required={f.required} inputMode={f.type === 'number' ? 'decimal' : undefined} />
          )
        }
        return (
          <div className="field" key={f.id}>
            <label htmlFor={id}>{f.label}{f.required ? ' *' : ''}</label>
            {input}
            {f.help && <small className="muted">{f.help}</small>}
          </div>
        )
      })}
    </div>
  )
}

/** Tags input with the approved-tags datalist; with controlled tags only listed tags are accepted. */
export function TagsField({ id, tags = [], controlled = false, defaultValue = '' }) {
  const listId = `${id}-options`
  return (
    <div className="field">
      <label htmlFor={id}>Tags</label>
      <input type="text" id={id} name="tags" placeholder="Comma-separated, e.g. contract, 2026" list={listId}
        defaultValue={defaultValue} />
      <datalist id={listId}>{tags.map((t) => <option key={t} value={t} />)}</datalist>
      {controlled && <small className="muted">Only approved tags can be used: {tags.join(', ') || 'none defined yet'}.</small>}
    </div>
  )
}
