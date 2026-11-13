import { api } from './client'

export const getAccount = () => api('/account')
export const changePassword = (body) => api('/account/password', { method: 'PATCH', body })
export const disableMfa = (code) => api('/account/mfa', { method: 'DELETE', body: { code } })
export const createToken = (name, days) => api('/account/tokens', { method: 'POST', body: { name, days } })
export const revokeToken = (id) => api(`/account/tokens/${id}`, { method: 'DELETE' })
export const removeDevice = (id) => api(`/account/devices/${id}`, { method: 'DELETE' })
