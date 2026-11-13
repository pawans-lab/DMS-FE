import { api, apiUrl } from './client'

export const listFolders = () => api('/folders').then((d) => d.folders)
export const rootFolder = () => api('/folders/root')
export const getFolder = (id) => api(`/folders/${id}`)
export const folderHistory = (id) => api(`/folders/${id}/history`).then((d) => d.events)
export const createFolder = (name, parentId) =>
  api('/folders', { method: 'POST', body: { name, parent_id: parentId || '' } })
export const renameFolder = (id, name) => api(`/folders/${id}`, { method: 'PATCH', body: { name } })
export const moveFolder = (id, parentId) =>
  api(`/folders/${id}`, { method: 'PATCH', body: { parent_id: parentId || '' } })
export const copyFolder = (id, parentId) =>
  api(`/folders/${id}/copy`, { method: 'POST', body: { parent_id: parentId || '' } })
export const deleteFolder = (id) => api(`/folders/${id}`, { method: 'DELETE' })
export const restoreFolder = (id) => api(`/folders/${id}/restore`, { method: 'POST' })
export const purgeFolder = (id) => api(`/folders/${id}/purge`, { method: 'DELETE' })
export const setRetention = (id, keepLast, keepYears) =>
  api(`/folders/${id}/retention`, { method: 'PATCH', body: { keep_last: keepLast, keep_years: keepYears } })
export const folderZipUrl = (id, versions) =>
  apiUrl(id ? `/folders/${id}/download` : '/folders/download', versions ? { versions: 1 } : undefined)
