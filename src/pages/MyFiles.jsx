import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import Loading from '../components/Loading'

/** main.my_files: redirect to the user's home folder (found by AuthProvider, MIGRATION.md G1). */
export default function MyFiles() {
  const { homeFolderId, homeReady } = useAuth()
  if (homeFolderId) return <Navigate to={`/folders/${homeFolderId}`} replace />
  if (homeReady) return <Navigate to="/folders" replace />
  return <Loading />
}
