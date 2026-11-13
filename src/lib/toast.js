// Toast store (replaces flash messages and toast() in app.js). A plain store so that
// non-React code such as the react-query caches can raise toasts too.
let items = []
let seq = 0
const listeners = new Set()

const emit = () => listeners.forEach((fn) => fn(items))

export function dismiss(id) {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** kind: 'success' | 'error' | 'info'. Errors stay 10 s, others 5 s (app.js autoDismiss). */
export function toast(message, kind = 'info') {
  if (!message) return
  const id = ++seq
  items = [...items, { id, message, kind }]
  emit()
  setTimeout(() => dismiss(id), kind === 'error' ? 10000 : 5000)
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getToasts = () => items
