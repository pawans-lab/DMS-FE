// Single place that talks to the backend: session cookie, CSRF token and error codes.
// Rules come from DMS-BE/dms/routes/api.py (api_auth, _check_csrf, login, mfa_challenge).

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
export const DEVICE_CODES = new Set(['pending', 'blocked', 'platform', 'device'])

let csrfToken = null
let csrfPromise = null
let authErrorHandler = null

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.error) || `Request failed (${status}).`)
    this.status = status
    this.code = (data && data.code) || (status === 413 ? 'payload_too_large' : 'request_failed')
    this.data = data || {}
  }
}

/** Absolute URL of a backend path, for links, iframes, <img> and downloads. */
export function apiUrl(path, query) {
  return `${BASE}/api/v1${path}${toQuery(query)}`
}

/** A backend URL outside /api/v1 (SSO and OAuth redirects). */
export function backendUrl(path) {
  return `${BASE}${path}`
}

export function toQuery(query) {
  if (!query) return ''
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((v) => v !== '' && v != null && params.append(key, v))
    else params.append(key, value)
  })
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** Called with (code, error) for authentication_required, mfa_required, mfa_setup_required and device codes. */
export function setAuthErrorHandler(fn) {
  authErrorHandler = fn
}

export function setCsrfToken(token) {
  if (token) csrfToken = token
}

async function fetchCsrf() {
  const res = await fetch(apiUrl('/auth/csrf'), { credentials: 'include', headers: { Accept: 'application/json' } })
  const data = await res.json()
  csrfToken = data.csrf_token
  return csrfToken
}

export function getCsrf(force = false) {
  if (csrfToken && !force) return Promise.resolve(csrfToken)
  if (!csrfPromise || force) {
    csrfPromise = fetchCsrf().finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

async function parse(res) {
  const type = res.headers.get('Content-Type') || ''
  if (type.includes('application/json')) {
    try { return await res.json() } catch { return {} }
  }
  return {}
}

function notifyAuth(error) {
  const handled = ['authentication_required', 'mfa_required', 'mfa_setup_required']
  if (authErrorHandler && (handled.includes(error.code) || (error.status === 403 && DEVICE_CODES.has(error.code)))) {
    authErrorHandler(error.code, error)
  }
}

/**
 * Call /api/v1. `body` may be a plain object (sent as JSON) or FormData.
 * Options: method, query, body, raw (return the Response), silent (no auth redirect).
 */
export async function api(path, { method = 'GET', query, body, raw = false, silent = false } = {}, retried = false) {
  const headers = { Accept: 'application/json' }
  let payload
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (UNSAFE.has(method)) headers['X-CSRFToken'] = await getCsrf()

  const res = await fetch(apiUrl(path, query), { method, headers, body: payload, credentials: 'include' })
  if (raw && res.ok) return res
  const data = await parse(res)
  if (data && data.csrf_token) setCsrfToken(data.csrf_token)
  if (res.ok) return data

  const error = new ApiError(res.status, data)
  if (error.code === 'csrf_failed' && !retried) {
    await getCsrf(true)
    return api(path, { method, query, body, raw, silent }, true)
  }
  if (!silent) notifyAuth(error)
  throw error
}

/** Text body of a GET (used for text previews). */
export async function apiText(path, query) {
  const res = await api(path, { query, raw: true })
  return res.text()
}

/**
 * Multipart POST with upload progress (fetch has no upload progress events).
 * Resolves with { status, data }; rejects with ApiError.
 */
export function upload(path, formData, onProgress, retried = false) {
  return getCsrf().then((token) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl(path))
    xhr.withCredentials = true
    xhr.setRequestHeader('X-CSRFToken', token)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100))
    })
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok !== false) {
        resolve({ status: xhr.status, data })
        return
      }
      const error = new ApiError(xhr.status, data)
      if (error.code === 'csrf_failed' && !retried) {
        // Same FormData, so the same idempotency key, on the retry.
        getCsrf(true).then(() => upload(path, formData, onProgress, true)).then(resolve, reject)
        return
      }
      if (xhr.status === 413 && !data.error) error.message = 'The file is too large.'
      notifyAuth(error)
      reject(error)
    }
    xhr.onerror = () => reject(new ApiError(0, { error: 'Network error. Check your connection and try again.', code: 'network' }))
    xhr.send(formData)
  }))
}

export function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}
