// Email archive.
import { api, apiUrl } from './client'

export const listEmails = (query) => api('/emails', { query })
export const getEmail = (id) => api(`/emails/${id}`).then((d) => d.email)
/** Emails other users shared with me: { emails: [... with access, owner] }. */
export const sharedEmails = () => api('/emails/shared')
/** Owner only: { levels, shares: [{ id, principal_type, principal_id, principal, level, expires_at, expired }] }. */
export const emailShares = (id) => api(`/emails/${id}/shares`)
/** Owner only. `level`: 'view' | 'download'. */
export const shareEmail = (id, principalId, level, expiresAt, principalType = 'user') =>
  api(`/emails/${id}/shares`, {
    method: 'POST', body: { principal_type: principalType, principal_id: principalId, level, expires_at: expiresAt || '' },
  })
export const unshareEmail = (id, entryId) => api(`/emails/${id}/shares/${entryId}`, { method: 'DELETE' })
/**
 * The message body as a standalone sandboxed HTML document, for an iframe `src`. The server embeds its
 * images as data: URLs and sends the document's own CSP; a srcdoc frame would inherit this page's CSP
 * instead, which does not allow inline styles.
 */
export const emailRenderUrl = (id) => apiUrl(`/emails/${id}/render`)
export const importAttachment = (body) => api('/documents/import-email-attachment', { method: 'POST', body })
export const emlUrl = (id) => apiUrl(`/emails/${id}/eml`)
/** A copy of the .eml with the linked images embedded (the archived original is unchanged). */
export const emlWithImagesUrl = (id) => apiUrl(`/emails/${id}/eml`, { with_images: 1 })
