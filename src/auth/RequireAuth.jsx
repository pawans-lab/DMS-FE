import { Navigate, useLocation } from 'react-router-dom'
import Loading from '../components/Loading'
import { useAuth } from './authContext'

/** Replaces enforce_request_security() for the SPA routes. */
export default function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  const here = location.pathname + location.search

  if (status === 'loading') return <Loading />
  if (status === 'anon') return <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />
  if (status === 'mfa') return <Navigate to="/mfa" replace />
  if (status === 'device_pending') return <Navigate to="/device-pending" replace />
  if (status === 'blocked') return <Navigate to="/blocked" replace />
  if (status === 'mfa_setup' && location.pathname !== '/account/mfa') return <Navigate to="/account/mfa" replace />
  return children
}
