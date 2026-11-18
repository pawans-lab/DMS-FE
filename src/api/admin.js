// The admin console and the audit log.
import { api } from './client'

export const adminStatus = () => api('/admin/status')
export const runMaintenance = () => api('/admin/maintenance', { method: 'POST' })
export const reindex = () => api('/admin/reindex', { method: 'POST' })

export const listUsers = (q) => api('/admin/users', { query: { q } }).then((d) => d.users)
export const getUser = (id) => api(`/admin/users/${id}`)
export const createUser = (body) => api('/admin/users', { method: 'POST', body })
export const updateUser = (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body })

export const listRoles = () => api('/admin/roles')
export const createRole = (body) => api('/admin/roles', { method: 'POST', body })
export const updateRole = (id, body) => api(`/admin/roles/${id}`, { method: 'PATCH', body })
export const deleteRole = (id) => api(`/admin/roles/${id}`, { method: 'DELETE' })

export const getSettings = () => api('/admin/settings').then((d) => d.settings)
export const saveSettings = (body) => api('/admin/settings', { method: 'PATCH', body })

export const getMetadata = () => api('/admin/metadata')
export const saveType = (body) => api('/admin/metadata/types', { method: 'POST', body })
export const deleteType = (id) => api(`/admin/metadata/types/${id}`, { method: 'DELETE' })
export const saveField = (body) => api('/admin/metadata/fields', { method: 'POST', body })
export const deleteField = (id) => api(`/admin/metadata/fields/${id}`, { method: 'DELETE' })
export const saveVocabulary = (body) => api('/admin/metadata/vocabularies', { method: 'POST', body })
export const deleteVocabulary = (id) => api(`/admin/metadata/vocabularies/${id}`, { method: 'DELETE' })
export const addTags = (names) => api('/admin/metadata/tags', { method: 'POST', body: { names } })
export const deleteTag = (id) => api(`/admin/metadata/tags/${id}`, { method: 'DELETE' })

export const listDevices = () => api('/admin/devices').then((d) => d.devices)
export const deviceAction = (id, action) => api(`/admin/devices/${id}`, { method: 'PATCH', body: { action } })

/** Who connected which Gmail mailbox and its sync health; no email content. */
export const gmailAccounts = (page, perPage = 50) => api('/admin/gmail/accounts', { query: { page, per_page: perPage } })
/** Disable/unlink any user's mailbox (revokes the token). The admin never gets content access. */
export const disconnectGmailAccount = (id) => api(`/admin/gmail/accounts/${id}/disconnect`, { method: 'POST' })

/**
 * Reassign ownership to `toUserId`: either `items` [{ type: 'folder'|'document', id }] or everything
 * `fromUserId` owns. Resolves with { count, reassigned }.
 */
export const reassignOwnership = ({ toUserId, items, fromUserId }) => api('/admin/ownership/reassign', {
  method: 'POST',
  body: fromUserId ? { to_user_id: toUserId, from_user_id: fromUserId } : { to_user_id: toUserId, items },
})

/** { folders: [{ id, name, path, owner }], documents: [{ id, name, folder_id, owner }] } */
export const legalHolds = () => api('/admin/legal-holds')
/** Place (`hold` true) or release a legal hold on a folder or document. */
export const setLegalHold = (kind, id, hold, reason = '') =>
  api(`/admin/legal-hold/${kind}/${id}`, { method: 'PUT', body: { hold, reason } })

/**
 * Audit log. `filters`: category, action, entity_type, entity_id, status, q, date_from, date_to (YYYY-MM-DD),
 * and for administrators user_id (everyone's entries otherwise).
 */
export const activity = (page, perPage = 50, filters = {}) => {
  const query = { page, per_page: perPage }
  Object.entries(filters).forEach(([key, value]) => { if (value) query[key] = value })
  return api('/activity', { query })
}
