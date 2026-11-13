import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createFolder } from '../../api/folders'
import { toast } from '../../lib/toast'
import FolderSelect from '../FolderSelect'
import Modal from '../Modal'

/** #folder-modal in base.html. */
export default function FolderModal({ onClose, folderId = '' }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState(folderId == null ? '' : String(folderId))
  const mutation = useMutation({
    mutationFn: () => createFolder(name, parentId),
    meta: { inline: true },
    onSuccess: (data) => {
      toast(`Folder '${data.folder.name}' created.`, 'success')
      onClose()
      navigate(`/folders/${data.folder.id}`)
    },
  })
  return (
    <Modal title="New folder" onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="field">
          <label htmlFor="folder-name">Name</label>
          <input type="text" id="folder-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          <small className="muted">Not allowed: &lt; &gt; : &quot; / \ | ? * and duplicate names in the same folder.</small>
        </div>
        <div className="field">
          <label htmlFor="folder-parent">Location</label>
          <FolderSelect id="folder-parent" value={parentId} onChange={setParentId} needEdit />
        </div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>Create folder</button>
        </div>
      </form>
    </Modal>
  )
}
