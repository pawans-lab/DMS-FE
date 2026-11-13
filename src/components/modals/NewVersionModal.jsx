import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { uuid } from '../../api/client'
import { checkin, uploadVersion } from '../../api/documents'
import { refreshData } from '../../lib/query'
import { toast } from '../../lib/toast'
import Dropzone from '../Dropzone'
import Modal from '../Modal'

/**
 * #new-version-modal (base.html / detail.html) and, with `checkIn`, #checkin-modal (detail.html).
 * `doc` is { id, name, extension, version, version_number }. version_number is sent as base_version:
 * if someone else uploaded a version meanwhile, the server answers 409 instead of stacking on top.
 */
export default function NewVersionModal({ onClose, doc, checkIn = false }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState([])
  const [major, setMajor] = useState('0')
  const [note, setNote] = useState('')
  const [idempotencyKey] = useState(uuid)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const accept = doc.extension ? `.${doc.extension}` : ''

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!checkIn && !files.length) { setError('Please choose a file.'); return }
    const data = new FormData()
    if (files[0]) data.append('file', files[0])
    data.append('major', major)
    data.append('note', note)
    data.append('idempotency_key', idempotencyKey)
    if (doc.version_number) data.append('base_version', String(doc.version_number))
    setProgress(0)
    try {
      const { data: result } = checkIn
        ? await checkin(doc.id, data, setProgress)
        : await uploadVersion(doc.id, data, setProgress)
      await refreshData(queryClient)
      onClose()
      if (checkIn) toast(result.version ? `Checked in as version ${result.version}.` : 'Checked in without changes.', 'success')
      else toast(result.created ? `Version ${result.version} uploaded.` : 'This version was already uploaded.', 'success')
      navigate(`/documents/${doc.id}`)
    } catch (err) {
      setProgress(null)
      if (err.status === 409 && err.data?.current_version) {
        await refreshData(queryClient)
        setError(`${err.message} Close this dialog to see version ${err.data.current_version}.`)
      } else {
        setError(err.message)
      }
    }
  }

  return (
    <Modal title={checkIn ? 'Check in' : 'Upload New Version'} onClose={onClose}>
      <form onSubmit={submit} encType="multipart/form-data">
        <p className="muted">
          {checkIn
            ? 'Upload your edited file to save it as a new version, or check in without changes. Either way the document is unlocked.'
            : `Updating “${doc.name}” (currently version ${doc.version || '1.0'}). The current version stays in the history. The new file must be a .${doc.extension} file.`}
        </p>
        <Dropzone files={files} onFiles={setFiles} required={!checkIn} accept={accept}
          title={checkIn ? 'Edited file (optional)' : 'Drop the updated file here or click to browse'} />
        <fieldset className="field">
          <label>Version type</label>
          <label className="check"><input type="radio" name="major" value="0" checked={major === '0'} onChange={() => setMajor('0')} /> Minor version (e.g. 1.0 → 1.1)</label>
          <label className="check"><input type="radio" name="major" value="1" checked={major === '1'} onChange={() => setMajor('1')} /> Major version (e.g. 1.1 → 2.0)</label>
        </fieldset>
        <div className="field">
          <label htmlFor="nv-note">Change comment</label>
          <input type="text" id="nv-note" maxLength={500} placeholder={checkIn ? undefined : 'What changed?'}
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {progress !== null && <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={progress !== null}>{checkIn ? 'Check in' : 'Upload version'}</button>
        </div>
      </form>
    </Modal>
  )
}
