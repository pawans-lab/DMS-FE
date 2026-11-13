import { api, getCsrf } from './client'

export const authOptions = () => api('/auth/options', { silent: true })
export const me = () => api('/me', { silent: true })

export async function login(username, password) {
  await getCsrf()
  return api('/auth/login', { method: 'POST', body: { username, password }, silent: true })
}
export const verifyMfa = (code) => api('/auth/mfa', { method: 'POST', body: { code }, silent: true })
export const logout = () => api('/auth/logout', { method: 'POST', silent: true })
export const register = (data) => api('/auth/register', { method: 'POST', body: data, silent: true })
export const setup = (data) => api('/auth/setup', { method: 'POST', body: data, silent: true })
export const mfaSetup = () => api('/auth/mfa/setup')
export const mfaEnable = (code) => api('/auth/mfa/setup', { method: 'POST', body: { code } })

/** 200 → true, 403 → false. Used to infer capabilities /me does not return (MIGRATION.md G1). */
export async function probe(path, query) {
  try {
    await api(path, { query, silent: true })
    return true
  } catch {
    return false
  }
}
