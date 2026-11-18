import { api, apiText, apiUrl, upload } from './client'

/** Every visible document. /documents has no filters or sort (MIGRATION.md G3), so callers filter. */
export async function allDocuments() {
  const out = []
  let offset = 0
  for (;;) {
    const page = await api('/documents', { query: { limit: 1000, offset } })
    out.push(...page.documents)
    if (page.next_offset == null) return out
    offset = page.next_offset
  }
}

export const getDocument = (id) => api(`/documents/${id}`)
export const compareVersions = (id, a, b) => api(`/documents/${id}/compare`, { query: { a, b } })
export const uploadDocuments = (formData, onProgress) => upload('/documents', formData, onProgress)
export const uploadVersion = (id, formData, onProgress) => upload(`/documents/${id}/versions`, formData, onProgress)
export const checkin = (id, formData, onProgress) => upload(`/documents/${id}/checkin`, formData, onProgress)
export const checkout = (id) => api(`/documents/${id}/checkout`, { method: 'POST' })
export const release = (id) => api(`/documents/${id}/release`, { method: 'POST' })
export const updateDocument = (id, body) => api(`/documents/${id}`, { method: 'PATCH', body })
export const renameDocument = (id, name) => updateDocument(id, { name })
export const moveDocument = (id, folderId) => updateDocument(id, { folder_id: folderId || '' })
export const copyDocument = (id, folderId) =>
  api(`/documents/${id}/copy`, { method: 'POST', body: { folder_id: folderId || '' } })
export const addLink = (id, folderId) =>
  api(`/documents/${id}/links`, { method: 'POST', body: { folder_id: folderId || '' } })
export const removeLink = (linkId) => api(`/documents/links/${linkId}`, { method: 'DELETE' })
export const deleteDocument = (id) => api(`/documents/${id}`, { method: 'DELETE' })
export const restoreDocument = (id) => api(`/documents/${id}/restore`, { method: 'POST' })
export const purgeDocument = (id) => api(`/documents/${id}/purge`, { method: 'DELETE' })
/** `baseVersion` = the current version number the user saw; the server answers 409 if it has changed. */
export const restoreVersion = (id, number, idempotencyKey, baseVersion) =>
  api(`/documents/${id}/versions/${number}/restore`, {
    method: 'POST', body: { idempotency_key: idempotencyKey, base_version: baseVersion ?? '' },
  })
/** Short-lived signed download URL: { url, expires_in }. */
export const downloadLink = (id, version) => api(`/documents/${id}/download-link`, { query: { version } })
export const textPreview = (id) => apiText(`/documents/${id}/preview`)

export const contentUrl = (id, version) => apiUrl(`/documents/${id}/content`, version ? { version } : undefined)
export const previewUrl = (id) => apiUrl(`/documents/${id}/preview`)
export const renderUrl = (id) => apiUrl(`/documents/${id}/render`)

export const recent = () => api('/recent').then((d) => d.viewed)
export const recentVersions = (limit = 200) => api('/versions', { query: { limit } }).then((d) => d.versions)
/** { items: shared with me, shared_by_me: what I shared (with recipients), counts }. */
export const shared = () => api('/shared')
export const recycleBin = () => api('/recycle-bin')
export const emptyRecycleBin = () => api('/recycle-bin', { method: 'DELETE' })
export const dashboard = () => api('/dashboard').then((d) => d.stats)
export const metadataSchema = (folderId, documentTypeId) =>
  api('/metadata/schema', { query: { folder_id: folderId || '', document_type_id: documentTypeId || '' } })
export const directory = (q) => api('/directory', { query: { q } })
