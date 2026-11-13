import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { addLink, copyDocument, moveDocument } from '../../api/documents'
import { copyFolder, moveFolder } from '../../api/folders'
import { useFolders } from '../../hooks/data'
import { descendantsOf } from '../../lib/folders'
import { toast } from '../../lib/toast'
import FolderSelect from '../FolderSelect'
import Modal from '../Modal'

const TITLES = { move: 'Move ', copy: 'Copy ', link: 'Add shortcut' }
const BUTTONS = { move: 'Move here', copy: 'Copy here', link: 'Add shortcut here' }

/**
 * #move-modal in base.html, in its three modes: move, copy (to…) and link (add shortcut).
 * `current` is the item's present folder id ('' = root). When moving or copying a folder, the folder
 * itself and its descendants are not offered.
 */
export default function MoveModal({ onClose, kind, mode = 'move', id, name, current = '' }) {
  const navigate = useNavigate()
  const { folders, byId } = useFolders()
  const isFolder = kind === 'folder'
  const what = isFolder ? 'folder' : 'document'
  const [target, setTarget] = useState(current == null ? '' : String(current))
  const exclude = useMemo(() => (isFolder ? descendantsOf(folders, id) : null), [isFolder, folders, id])

  const label = {
    move: `Choose a new location for “${name}”.`,
    copy: `Choose where to put a copy of “${name}”${isFolder ? ' and everything in it.' : '. The copy starts at version 1.0.'}`,
    link: `“${name}” will also appear in the chosen folder. The document itself stays where it is.`,
  }[mode]

  const mutation = useMutation({
    meta: { inline: true },
    mutationFn: () => {
      if (mode === 'link') return addLink(id, target)
      if (mode === 'copy') return isFolder ? copyFolder(id, target) : copyDocument(id, target)
      return isFolder ? moveFolder(id, target) : moveDocument(id, target)
    },
    onSuccess: (data) => {
      const where = target ? byId.get(Number(target))?.path || 'the folder' : 'Root'
      onClose()
      if (mode === 'link') toast(`Shortcut added to ${where}.`, 'success')
      else if (mode === 'copy' && isFolder) {
        toast(`Folder copied to ${where}.`, 'success')
        navigate(`/folders/${data.folder.id}`)
      } else if (mode === 'copy') {
        toast(`Copied to ${where} as '${data.document.name}'.`, 'success')
        navigate(`/documents/${data.document.id}`)
      } else toast(isFolder ? `Folder moved to ${where}.` : `Moved '${name}' to ${where}.`, 'success')
    },
  })

  return (
    <Modal title={mode === 'link' ? TITLES.link : TITLES[mode] + what} onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <p className="muted">{label}</p>
        <div className="field">
          <label htmlFor="move-select">Destination</label>
          <FolderSelect id="move-select" value={target} onChange={setTarget} needEdit exclude={exclude} />
        </div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{BUTTONS[mode]}</button>
        </div>
      </form>
    </Modal>
  )
}
