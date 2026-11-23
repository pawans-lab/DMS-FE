// Document Validity Management & Expiry Monitoring, and the notification centre (DMS-BE/dms/validity/routes.py).
import { api, apiUrl } from './client'

export const folderValidity = (folderId) => api(`/folders/${folderId}/validity`, { silent: true })
export const setFolderValidity = (folderId, mode, analyseExisting = false) =>
  api(`/folders/${folderId}/validity`, { method: 'PUT', body: { mode, analyse_existing: analyseExisting } })

export const documentValidity = (docId) => api(`/documents/${docId}/validity`, { silent: true })
/** Confirm or correct the extracted values (makes them "verified"). */
export const confirmValidity = (docId, body) => api(`/documents/${docId}/validity`, { method: 'PUT', body })
export const analyseValidity = (docId) => api(`/documents/${docId}/validity/analyse`, { method: 'POST' })
/** state: active | paused | disabled. */
export const setMonitoring = (docId, state, pausedUntil, reason) =>
  api(`/documents/${docId}/validity/monitoring`, {
    method: 'POST', body: { state, paused_until: pausedUntil || '', reason: reason || '' },
  })
export const setSubscription = (docId, subscribed) =>
  api(`/documents/${docId}/validity/subscription`, { method: 'PUT', body: { subscribed } })
export const validityHistory = (docId) => api(`/documents/${docId}/validity/history`).then((d) => d.events)

/** `form` is FormData when evidence is attached, otherwise a plain object. */
export const createException = (docId, form) =>
  api(`/documents/${docId}/validity/exceptions`, { method: 'POST', body: form })
export const updateException = (docId, id, form) =>
  api(`/documents/${docId}/validity/exceptions/${id}`, { method: 'PATCH', body: form })
export const withdrawException = (docId, id, reason) =>
  api(`/documents/${docId}/validity/exceptions/${id}/withdraw`, { method: 'POST', body: { reason: reason || '' } })
export const evidenceUrl = (docId, id) => apiUrl(`/documents/${docId}/validity/exceptions/${id}/evidence`)

export const validityDocuments = (query) => api('/validity/documents', { query })

export const listNotifications = (query) => api('/notifications', { query })
export const unreadNotifications = () => api('/notifications/unread-count', { silent: true }).then((d) => d.unread)
export const readNotification = (id) => api(`/notifications/${id}/read`, { method: 'POST' })
export const readAllNotifications = () => api('/notifications/read-all', { method: 'POST' })
export const notificationPreferences = () => api('/notifications/preferences')
export const setNotificationPreferences = (emailMode) =>
  api('/notifications/preferences', { method: 'PUT', body: { email_mode: emailMode } })
