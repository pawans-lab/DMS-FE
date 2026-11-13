import { useEffect, useMemo } from 'react'
import { useAuth } from '../auth/authContext'
import { useFolders } from '../hooks/data'

/**
 * Port of fillFolderSelect() in app.js. With `needEdit`, folders without edit permission are disabled
 * and "Root" is offered only when the user may edit the repository root. `exclude` is a Set of ids
 * (a folder and its descendants when moving a folder). An unusable value falls back to the first usable option.
 */
export default function FolderSelect({ id, value, onChange, needEdit = false, exclude, required }) {
  const { tree, isFetched } = useFolders()
  const { rootPerms } = useAuth()
  const showRoot = !needEdit || rootPerms.includes('edit')

  const options = useMemo(() => tree
    .filter(({ folder }) => !(exclude && exclude.has(String(folder.id))))
    .map(({ folder, depth }) => ({
      value: String(folder.id),
      label: '   '.repeat(depth + 1) + folder.name,
      title: folder.path,
      disabled: needEdit && !folder.permissions.includes('edit'),
    })), [tree, exclude, needEdit])

  const current = value == null ? '' : String(value)
  const valid = (current === '' && showRoot) || options.some((o) => o.value === current && !o.disabled)

  useEffect(() => {
    if (!isFetched || valid) return
    const first = showRoot ? '' : options.find((o) => !o.disabled)?.value
    if (first !== undefined && first !== current) onChange(first)
  }, [isFetched, valid, showRoot, options, current, onChange])

  return (
    <select id={id} value={current} onChange={(e) => onChange(e.target.value)} required={required}>
      {showRoot && <option value="">Root (top level)</option>}
      {options.map((o) => <option key={o.value} value={o.value} title={o.title} disabled={o.disabled}>{o.label}</option>)}
    </select>
  )
}
