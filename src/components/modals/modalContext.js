import { createContext, useContext } from 'react'

export const ModalContext = createContext(null)

/**
 * open(type, props) for 'upload' | 'folder' | 'newVersion' | 'rename' | 'move';
 * confirm(text) → Promise<boolean>; currentFolder / setCurrentFolder: the folder being viewed as
 * { id, inHome } (default upload destination, "My Files" highlight in the sidebar).
 */
export function useModals() {
  return useContext(ModalContext)
}
