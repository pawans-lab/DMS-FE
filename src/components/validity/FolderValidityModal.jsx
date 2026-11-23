import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { setFolderValidity } from '../../api/validity'
import { toast } from '../../lib/toast'
import Modal from '../Modal'

/** Folder settings: validity monitoring on, off, or inherited from the parent folder. */
export default function FolderValidityModal({ folder, setting, onClose }) {
  const [mode, setMode] = useState(setting.mode)
  const [analyseExisting, setAnalyseExisting] = useState(false)
  const inheritedOn = setting.mode === 'inherit' ? setting.effective : null
  const willBeOn = mode === 'enabled' || (mode === 'inherit' && (inheritedOn ?? false))
  const mutation = useMutation({
    mutationFn: () => setFolderValidity(folder.id, mode, willBeOn && analyseExisting),
    meta: { inline: true },
    onSuccess: (data) => {
      toast(`Validity monitoring is now ${data.effective ? 'on' : 'off'} for “${folder.name}”.`
        + (data.queued ? ` ${data.queued} existing document(s) queued for analysis.` : ''), 'success')
      onClose()
    },
  })
  const option = (value, label, help) => (
    <label className="check" style={{ alignItems: 'flex-start' }}>
      <input type="radio" name="validity-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
      <span><strong>{label}</strong><br /><small className="muted">{help}</small></span>
    </label>
  )
  return (
    <Modal title="Document validity monitoring" onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <p className="small muted">
          Documents uploaded into a monitored folder are analysed for their issue and expiry dates. After you
          confirm the dates, daily alerts count down to the expiry date. Switching monitoring off keeps all
          existing validity data.
        </p>
        {setting.module_enabled === false && (
          <p className="form-error">Validity monitoring is switched off on this server (VALIDITY_MONITORING_ENABLED).</p>
        )}
        {option('inherit', 'Same as the parent folder',
          setting.mode === 'inherit'
            ? `Currently ${setting.effective ? 'on' : 'off'}${setting.inherited_from ? ` (from “${setting.inherited_from.name}”)` : ''}.`
            : 'Follow the nearest parent folder that has its own setting (off at the top level).')}
        {option('enabled', 'Enable Document Validity Monitoring', 'Applies to this folder and to subfolders that have no setting of their own.')}
        {option('disabled', 'Disabled', 'No new analyses or alerts for this folder and subfolders without their own setting.')}
        {willBeOn && (
          <label className="check">
            <input type="checkbox" checked={analyseExisting} onChange={(e) => setAnalyseExisting(e.target.checked)} />
            Also analyse documents already in this folder
          </label>
        )}
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>Save</button>
        </div>
      </form>
    </Modal>
  )
}
