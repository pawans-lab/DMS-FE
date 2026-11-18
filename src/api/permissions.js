import { api } from './client'

const permBase = (kind, id, number) => `/permissions/${kind}/${id}${number ? `/${number}` : ''}`

export const getPermissions = (kind, id, number) => api(permBase(kind, id, number))
/** `level`: 'view' | 'download' | 'edit'. Owner or administrator only. */
export const share = (kind, id, number, principalId, level, { principalType = 'user', expiresAt } = {}) =>
  api(`${permBase(kind, id, number)}/share`, {
    method: 'POST',
    body: { principal_type: principalType, principal_id: principalId, level, ...(expiresAt ? { expires_at: expiresAt } : {}) },
  })
export const grant = (kind, id, number, principalType, principalId, permissions) =>
  api(`${permBase(kind, id, number)}/grant`, {
    method: 'POST', body: { principal_type: principalType, principal_id: principalId, permissions },
  })
export const removeEntry = (kind, id, number, entryId) =>
  api(`${permBase(kind, id, number)}/entries/${entryId}`, { method: 'DELETE' })
export const setInheritance = (kind, id, number, inherit, copy = true) =>
  api(`${permBase(kind, id, number)}/inheritance`, { method: 'PATCH', body: { inherit, copy } })
