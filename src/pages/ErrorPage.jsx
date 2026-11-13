import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { useTitle } from '../hooks/data'

const TITLES = { 403: 'Forbidden', 404: 'Not Found', 500: 'Something went wrong' }

/** error.html. Used for the 404 route, 403 guards and as the router error boundary. */
export function ErrorCard({ status = 404, title, message }) {
  const navigate = useNavigate()
  const heading = title || TITLES[status] || 'Error'
  useTitle(heading)
  return (
    <div className="card error-card">
      <div className="error-code">{status}</div>
      <h1>{heading}</h1>
      <p className="muted">{message || (status === 404 ? 'The page you were looking for does not exist.' : 'An unexpected error occurred.')}</p>
      <div className="actions center">
        <Link className="btn btn-primary" to="/">Go to dashboard</Link>
        <Link className="btn btn-ghost" to="/documents"
          onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); navigate(-1) } }}>Go back</Link>
      </div>
    </div>
  )
}

export default function ErrorPage(props) {
  return <ErrorCard {...props} />
}

/** errorElement of the router: a render error or a thrown response. */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error)) return <main className="content"><ErrorCard status={error.status} message={error.statusText} /></main>
  return (
    <main className="content">
      <ErrorCard status={500} title="Something went wrong" message="An unexpected error occurred. Reload the page and try again." />
    </main>
  )
}
