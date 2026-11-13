import { useState } from 'react'
import Icon from './Icon'

/** The `[data-dropzone]` label from base.html: file input over the whole area, drag highlight, chosen names. */
export default function Dropzone({ files, onFiles, multiple = false, required = false, accept, title, hint }) {
  const [over, setOver] = useState(false)
  const names = Array.from(files || []).map((f) => f.name)
  return (
    <label className={`dropzone${over ? ' is-over' : ''}`}
      onDragEnter={() => setOver(true)} onDragOver={() => setOver(true)}
      onDragLeave={() => setOver(false)} onDrop={() => setOver(false)}>
      <input type="file" name="file" multiple={multiple} required={required} accept={accept || undefined}
        onChange={(e) => onFiles(Array.from(e.target.files || []))} />
      <Icon name="upload-cloud" />
      <strong>{title}</strong>
      {hint && <span className="muted">{hint}</span>}
      <span className="dropzone-files">{names.length > 3 ? `${names.length} files selected` : names.join(', ')}</span>
    </label>
  )
}
