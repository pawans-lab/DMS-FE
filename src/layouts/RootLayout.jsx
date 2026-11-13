import { Outlet } from 'react-router-dom'
import AuthProvider from '../auth/AuthProvider'
import ModalProvider from '../components/modals/ModalProvider'
import Toasts from '../components/Toasts'

/** Providers that need the router (navigation after auth errors and from modals). */
export default function RootLayout() {
  return (
    <AuthProvider>
      <ModalProvider>
        <Outlet />
        <Toasts />
      </ModalProvider>
    </AuthProvider>
  )
}
