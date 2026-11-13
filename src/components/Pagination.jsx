import { Link, useSearchParams } from 'react-router-dom'

export default function Pagination({ page, pages }) {
  const [params] = useSearchParams()
  if (pages <= 1) return null
  const to = (p) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    return `?${next}`
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link className="btn btn-ghost btn-sm" to={to(page - 1)}>← Previous</Link>}
      <span className="muted">Page {page} of {pages}</span>
      {page < pages && <Link className="btn btn-ghost btn-sm" to={to(page + 1)}>Next →</Link>}
    </nav>
  )
}
