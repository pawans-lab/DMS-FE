import { ApiError } from '../api/client'

export default function Loading({ text = 'Loading…' }) {
  return <p className="muted" role="status">{text}</p>
}

/** Inline error for a failed query (the Jinja pages would have shown error.html). */
export function QueryError({ error }) {
  const message = error instanceof ApiError || error?.message ? error.message : 'Something went wrong.'
  return <div className="notice notice-error"><div>{message}</div></div>
}
