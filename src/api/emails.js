// Email archive.
import { api, apiUrl } from './client'

export const listEmails = (query) => api('/emails', { query })
export const getEmail = (id) => api(`/emails/${id}`).then((d) => d.email)
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
