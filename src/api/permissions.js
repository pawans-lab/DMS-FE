import { api } from './client'

const permBase = (kind, id, number) => `/permissions/${kind}/${id}${number ? `/${number}` : ''}`

export const getPermissions = (kind, id, number) => api(permBase(kind, id, number))
export const share = (kind, id, number, principalId, level) =>
  api(`${permBase(kind, id, number)}/share`, {
    method: 'POST', body: { principal_type: 'user', principal_id: principalId, level },
  })
export const grant = (kind, id, number, principalType, principalId, permissions) =>
  api(`${permBase(kind, id, number)}/grant`, {
    method: 'POST', body: { principal_type: principalType, principal_id: principalId, permissions },
  })
export const removeEntry = (kind, id, number, entryId) =>
  api(`${permBase(kind, id, number)}/entries/${entryId}`, { method: 'DELETE' })
export const setInheritance = (kind, id, number, inherit, copy = true) =>
  api(`${permBase(kind, id, number)}/inheritance`, { method: 'PATCH', body: { inherit, copy } })
