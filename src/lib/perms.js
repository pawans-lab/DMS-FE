// Which actions the signed-in user may perform on a folder or document (DMS Permissions Matrix v2).
// The backend sends `actions` (policy.actions_for) with every folder/document; buttons are driven by it.
// Older responses without `actions` fall back to the raw `permissions` set, conservatively.

/** Raw permissions that grant a share-level action when `actions` is missing. */
const SHARE_FALLBACK = {
  'item.view': ['view'],
  'item.download': ['download'],
  'item.version.create': ['edit'],
  'item.metadata.edit': ['edit'],
  'folder.create_child': ['upload', 'edit'],
  'folder.upload': ['upload', 'edit'],
}

/** Owner/Admin actions: without `actions`, only the owner (or someone with `manage`) gets them. */
const OWNER_ONLY = new Set([
  'item.version.restore', 'item.rename', 'item.move', 'item.copy', 'item.delete', 'item.restore', 'item.share',
])

/**
 * True when `item` (a folder or document JSON, or `{ permissions }` for the library root) allows `action`.
 * Keys: item.view, item.download, item.version.create, item.metadata.edit, item.version.restore,
 * item.rename, item.move, item.copy, item.delete, item.restore, item.share, item.purge,
 * folder.create_child, folder.upload.
 */
export function canDo(item, action) {
  if (!item) return false
  if (Array.isArray(item.actions)) return item.actions.includes(action)
  const perms = item.permissions || []
  if (OWNER_ONLY.has(action)) {
    if (item.legal_hold && (action === 'item.delete' || action === 'item.move')) return false
    return !!item.is_owner || perms.includes('manage')
  }
  if (action === 'item.purge') return false
  return (SHARE_FALLBACK[action] || []).some((p) => perms.includes(p))
}

/** `can(action)` bound to one item. */
export const actionsOf = (item) => (action) => canDo(item, action)
