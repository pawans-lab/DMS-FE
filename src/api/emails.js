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
export const emailBody = (id) => api(`/emails/${id}/body`).then((d) => d.body_html)
export const importAttachment = (body) => api('/documents/import-email-attachment', { method: 'POST', body })
/**
 * Inline (cid:) image as a data: URL. The sandboxed message frame has an opaque origin, so it cannot
 * send the session cookie to /inline/<n> itself (MIGRATION.md G11).
 */
export async function inlineDataUrl(id, part, kind = 'inline') {
  // kind: 'inline' = an image embedded in the message; 'images' = a stored copy of an image it links to.
  const res = await api(`/emails/${id}/${kind}/${part}`, { raw: true, silent: true })
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
export const emlUrl = (id) => apiUrl(`/emails/${id}/eml`)
/** A copy of the .eml with the linked images embedded (the archived original is unchanged). */
export const emlWithImagesUrl = (id) => apiUrl(`/emails/${id}/eml`, { with_images: 1 })
