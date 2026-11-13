// Folder tree helpers that replace the server-side folder_tree() and the #folder-data JSON in base.html.

/**
 * Depth-first [{folder, depth}] list, sorted by name, like services/folders.py folder_tree().
 * Folders whose parent is not visible become top-level entries.
 */
export function buildTree(folders) {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const children = new Map()
  folders.forEach((f) => {
    const parent = f.parent_id != null && byId.has(f.parent_id) ? f.parent_id : null
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(f)
  })
  children.forEach((list) => list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
  const out = []
  const walk = (parent, depth) => {
    ;(children.get(parent) || []).forEach((f) => {
      out.push({ folder: f, depth })
      walk(f.id, depth + 1)
    })
  }
  walk(null, 0)
  return out
}

/** The folder and all its descendants (app.js descendantsOf). Used to exclude move targets. */
export function descendantsOf(folders, id) {
  const out = new Set([String(id)])
  let grew = true
  while (grew) {
    grew = false
    folders.forEach((f) => {
      if (f.parent_id != null && out.has(String(f.parent_id)) && !out.has(String(f.id))) {
        out.add(String(f.id))
        grew = true
      }
    })
  }
  return out
}

/** Path of the parent folder from a folder path ("A / B / C" → "A / B"). */
export function parentPath(path) {
  const parts = (path || '').split(' / ')
  return parts.length > 1 ? parts.slice(0, -1).join(' / ') : 'Root'
}
