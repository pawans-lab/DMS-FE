import { Link, useSearchParams } from 'react-router-dom'

export default function SortHeader({ label, sortKey, sort, direction }) {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('sort', sortKey)
  next.set('dir', sort === sortKey && direction === 'desc' ? 'asc' : 'desc')
  next.set('page', '1')
  return (
    <Link to={`?${next}`} className={`sort${sort === sortKey ? ' is-sorted' : ''}`}>
      {label}{sort === sortKey && <> <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span></>}
    </Link>
  )
}
