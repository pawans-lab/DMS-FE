import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { logout, me, probe } from '../api/auth'
import { DEVICE_CODES, setAuthErrorHandler } from '../api/client'
import { getFolder, listFolders, rootFolder } from '../api/folders'
import { ROLE_CAPS } from '../lib/format'
import { toast } from '../lib/toast'
import { APP_NAME, AuthContext, PUBLIC_PATHS } from './authContext'

const STATUS_BY_CODE = {
  authentication_required: 'anon',
  mfa_required: 'mfa',
  mfa_setup_required: 'mfa_setup',
  pending: 'device_pending',
}

function statusOf(error) {
  if (!error) return 'ok'
  if (STATUS_BY_CODE[error.code]) return STATUS_BY_CODE[error.code]
  if (DEVICE_CODES.has(error.code)) return 'blocked'
  return 'anon'
}

/** services/folders.py ensure_home names My Files after the user name, with unsafe characters replaced. */
function homeName(username) {
  // eslint-disable-next-line no-control-regex
  return username.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.+$/, '').slice(0, 200)
}

/**
 * /me has no home_folder_id (MIGRATION.md G1). The home folder is the one named after the user
 * whose own breadcrumb trail is just "My Files" (api.py _crumbs renames it for its owner).
 */
async function findHomeFolder(username, folders) {
  const base = homeName(username)
  const candidates = folders.filter((f) => f.name.startsWith(base))
    .sort((a, b) => Number(b.name === base) - Number(a.name === base))
  for (const f of candidates) {
    const detail = await getFolder(f.id)
    const crumbs = detail.breadcrumbs
    if (crumbs.length === 1 && crumbs[0].id === f.id && crumbs[0].name === 'My Files') return f.id
  }
  return null
}

export default function AuthProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const meQuery = useQuery({ queryKey: ['me'], queryFn: me, retry: false, staleTime: 60_000 })
  const status = meQuery.isPending ? 'loading' : statusOf(meQuery.error)
  const user = status === 'ok' ? meQuery.data : null

  // /me has no capabilities (G1): use the predefined role names, then probe the endpoints each one opens.
  const capsQuery = useQuery({
    queryKey: ['caps', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const caps = new Set(user.roles.flatMap((r) => ROLE_CAPS[r] || []))
      const [admin, audit] = await Promise.all([probe('/admin/status'), probe('/activity', { per_page: 1 })])
      if (admin) caps.add('admin')
      if (audit) caps.add('audit')
      return [...caps]
    },
  })
  const rootQuery = useQuery({ queryKey: ['folders', 'root'], queryFn: rootFolder, enabled: !!user })
  const foldersQuery = useQuery({ queryKey: ['folders'], queryFn: listFolders, enabled: !!user })
  const homeQuery = useQuery({
    queryKey: ['home', user?.id],
    enabled: !!user && !!foldersQuery.data,
    staleTime: Infinity,
    queryFn: () => findHomeFolder(user.username, foldersQuery.data),
  })

  // Central handling of authentication error codes from any API call (client.js).
  useEffect(() => {
    setAuthErrorHandler((code) => {
      const here = window.location.pathname
      if (PUBLIC_PATHS.includes(here)) return
      if (code === 'authentication_required') {
        queryClient.setQueryData(['me'], undefined)
        queryClient.removeQueries({ queryKey: ['me'] })
        navigate(`/login?next=${encodeURIComponent(here + window.location.search)}`, { replace: true })
      } else if (code === 'mfa_required') navigate('/mfa', { replace: true })
      else if (code === 'mfa_setup_required') navigate('/account/mfa', { replace: true })
      else if (code === 'pending') navigate('/device-pending', { replace: true })
      else if (DEVICE_CODES.has(code)) navigate('/blocked', { replace: true })
    })
    return () => setAuthErrorHandler(null)
  }, [navigate, queryClient])

  // The Gmail OAuth callback lands on any route with ?gmail=connected|error&message=…. Show the message, clean
  // the URL and refresh the status. This runs before /me answers, so the toast also shows on /login when the
  // session has expired, and `next` never carries the parameters into a second toast after sign-in.
  const gmailHandled = useRef('')
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const result = params.get('gmail')
    if (!result || gmailHandled.current === location.search) return
    gmailHandled.current = location.search
    const message = params.get('message')
    if (result === 'connected') toast(message || 'Gmail connected.', 'success')
    else toast(message || 'Gmail could not be connected.', 'error')
    params.delete('gmail')
    params.delete('message')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true })
    queryClient.invalidateQueries({ queryKey: ['gmail-status'] })
    queryClient.invalidateQueries({ queryKey: ['emails'] })
  }, [location.pathname, location.search, location.hash, navigate, queryClient])

  // SSO / MFA callbacks land here with ?mfa_required=1 or ?auth_error=… (routes/auth.py _frontend_url).
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const authError = params.get('auth_error')
    if (params.get('mfa_required')) navigate('/mfa', { replace: true })
    else if (authError === 'pending') navigate('/device-pending', { replace: true })
    else if (authError === 'sso_failed') {
      toast('Single sign-on failed. Try again.', 'error')
      navigate('/login', { replace: true })
    } else if (authError) navigate('/blocked', { replace: true })
  }, [location.search, navigate])

  const refresh = useCallback(async () => {
    await queryClient.resetQueries()
  }, [queryClient])

  const signOut = useCallback(async () => {
    try { await logout() } catch { /* already signed out */ }
    queryClient.clear()
    toast('You have been signed out.', 'success')
    navigate('/login', { replace: true })
  }, [navigate, queryClient])

  const value = useMemo(() => {
    const caps = new Set(capsQuery.data || [])
    return {
      status,
      user,
      caps,
      capsReady: !user || capsQuery.isFetched,
      has: (cap) => caps.has('admin') || caps.has(cap),
      rootPerms: rootQuery.data?.permissions || [],
      homeFolderId: homeQuery.data ?? null,
      homeReady: !user || homeQuery.isFetched || foldersQuery.isError,
      label: user ? user.display_name || user.username : '',
      appName: APP_NAME,
      refresh,
      signOut,
    }
  }, [status, user, capsQuery.data, capsQuery.isFetched, rootQuery.data, homeQuery.data, homeQuery.isFetched,
    foldersQuery.isError, refresh, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
