import Loading from '../components/Loading'
import ErrorPage from '../pages/ErrorPage'
import { useAuth } from './authContext'

/** security/auth.py require_capability: 403 unless the user has the capability (admin has all). */
export default function RequireCap({ cap, children }) {
  const { has, capsReady } = useAuth()
  if (!capsReady) return <Loading />
  if (!has(cap)) {
    return <ErrorPage status={403} title="Forbidden" message="You do not have permission to open this page." />
  }
  return children
}
