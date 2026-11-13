import { useSyncExternalStore } from 'react'
import { dismiss, getToasts, subscribe } from '../lib/toast'

/** The flash-message area from base.html. Use `toast()` from lib/toast (or useToast) to add one. */
export default function Toasts() {
  const items = useSyncExternalStore(subscribe, getToasts)
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>&times;</button>
        </div>
      ))}
    </div>
  )
}
