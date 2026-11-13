// Gmail archiving of the signed-in user's own mailbox (every user can connect one).
import { api } from './client'

export const gmailStatus = () => api('/gmail/status').then((d) => d.status)
/** { authorization_url }: the browser goes there as a full-page redirect, never fetch or a popup. */
export const gmailConnect = () => api('/gmail/connect')
export const gmailDisconnect = () => api('/gmail/disconnect', { method: 'POST', body: {} })
/** 202 { queued }. A normal user retries their own mailbox; an admin retries every mailbox. */
export const gmailRetry = () => api('/gmail/retry', { method: 'POST' })
/**
 * Runs the synchronization now and resolves with { result: { message, imported, failed, … } }.
 * Rejects with 409 (not connected, or a sync is already running) or 502 (Gmail failed).
 */
export const gmailSync = () => api('/gmail/sync', { method: 'POST' })
