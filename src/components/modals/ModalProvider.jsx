import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../auth/authContext'
import ConfirmDialog from './ConfirmDialog'
import FolderModal from './FolderModal'
import { ModalContext } from './modalContext'
import MoveModal from './MoveModal'
import NewVersionModal from './NewVersionModal'
import RenameModal from './RenameModal'
import UploadModal from './UploadModal'

const MODALS = { upload: UploadModal, folder: FolderModal, newVersion: NewVersionModal, rename: RenameModal, move: MoveModal }

/** The global modals of base.html, one at a time, plus the confirm dialog (post_button data-confirm). */
export default function ModalProvider({ children }) {
  const { homeFolderId } = useAuth()
  const [modal, setModal] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null)
  // The folder being viewed: { id, inHome }. Uploads and new folders go there, otherwise to My Files.
  const [currentFolder, setCurrentFolder] = useState(null)

  const open = useCallback((type, props = {}) => setModal({ type, props }), [])
  const close = useCallback(() => setModal(null), [])
  const confirm = useCallback((text) => new Promise((resolve) => setPendingConfirm({ text, resolve })), [])

  const value = useMemo(() => ({ open, close, confirm, currentFolder, setCurrentFolder }),
    [open, close, confirm, currentFolder])

  const Active = modal ? MODALS[modal.type] : null
  const defaultFolder = currentFolder ? (currentFolder.id ?? '') : (homeFolderId ?? '')

  return (
    <ModalContext.Provider value={value}>
      {children}
      {Active && <Active folderId={defaultFolder} {...modal.props} onClose={close} />}
      {pendingConfirm && (
        <ConfirmDialog text={pendingConfirm.text}
          onConfirm={() => { pendingConfirm.resolve(true); setPendingConfirm(null) }}
          onClose={() => { pendingConfirm.resolve(false); setPendingConfirm(null) }} />
      )}
    </ModalContext.Provider>
  )
}
