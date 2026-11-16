import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/**
 * { status, user, has(cap), caps, capsReady, rootPerms, homeFolderId, appName, refresh, signOut }
 * status: loading | ok | anon | mfa | mfa_setup | device_pending | blocked
 * Replaces Jinja's current_user, has_cap(), root_can_edit and home_folder_id.
 */
export function useAuth() {
  return useContext(AuthContext)
}

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'JMBVault'

/** Routes reachable without a session; the central error handler never redirects away from them. */
export const PUBLIC_PATHS = ['/login', '/register', '/setup', '/mfa', '/device-pending', '/blocked']
