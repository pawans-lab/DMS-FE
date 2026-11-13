import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { APP_NAME } from '../auth/authContext'

/** auth/_layout.html. Flash messages appear as toasts (components/Toasts). */
export default function AuthLayout() {
  useEffect(() => {
    document.body.classList.add('auth-body')
    return () => document.body.classList.remove('auth-body')
  }, [])
  return (
    <main className="auth-wrap">
      <div className="auth-brand">
        <img src="/logo.svg" alt="" width="36" height="36" />
        <span>{APP_NAME}</span>
      </div>
      <div className="card auth-card">
        <Outlet />
      </div>
    </main>
  )
}
