import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { renameDocument } from '../../api/documents'
import { renameFolder } from '../../api/folders'
import { toast } from '../../lib/toast'
import Modal from '../Modal'

/** #rename-modal in base.html. For documents the name is selected up to the extension. */
export default function RenameModal({ onClose, kind, id, name: currentName }) {
  const isFolder = kind === 'folder'
  const [name, setName] = useState(currentName || '')
  const inputRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const input = inputRef.current
      if (!input) return
      const dot = input.value.lastIndexOf('.')
      input.setSelectionRange(0, !isFolder && dot > 0 ? dot : input.value.length)
    }, 40)
    return () => clearTimeout(t)
  }, [isFolder])
  const mutation = useMutation({
    mutationFn: () => (isFolder ? renameFolder(id, name) : renameDocument(id, name)),
    meta: { inline: true },
    onSuccess: (data) => {
      toast(isFolder ? `Folder renamed to '${data.folder.name}'.` : `Renamed to '${data.document.name}'.`, 'success')
      onClose()
    },
  })
  return (
    <Modal title={isFolder ? 'Rename folder' : 'Rename document'} onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="field">
          <label htmlFor="rename-input">New name</label>
          <input ref={inputRef} type="text" id="rename-input" required maxLength={200} value={name}
            onChange={(e) => setName(e.target.value)} />
        </div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>Rename</button>
        </div>
      </form>
    </Modal>
  )
}
