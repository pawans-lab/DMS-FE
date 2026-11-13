import { createBrowserRouter } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import RequireCap from './auth/RequireCap'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import RootLayout from './layouts/RootLayout'
import Dashboard from './pages/Dashboard'
import ErrorPage, { RouteError } from './pages/ErrorPage'
import Favourites from './pages/Favourites'
import MyFiles from './pages/MyFiles'
import Recent from './pages/Recent'
import RecycleBin from './pages/RecycleBin'
import Shared from './pages/Shared'
import Versions from './pages/Versions'
import {
  Activity, AdminIndex, Compare, Devices, EmailDetail, EmailsIndex, GmailSettings, Mailboxes, Metadata, MfaSetup, Permissions, Profile, RoleEdit, Roles, Search, Settings, UserEdit, Users,
} from './pages/lazy'
import Login from './pages/auth/Login'
import Message from './pages/auth/Message'
import Mfa from './pages/auth/Mfa'
import Register from './pages/auth/Register'
import Setup from './pages/auth/Setup'
import DocumentDetail from './pages/documents/DocumentDetail'
import DocumentsIndex from './pages/documents/DocumentsIndex'
import Browse from './pages/folders/Browse'
import History from './pages/folders/History'

const cap = (name, element) => <RequireCap cap={name}>{element}</RequireCap>

/** Same URLs as the Flask page routes, so bookmarks keep working. */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      // Login renders its own full-page themed layout (particles + JMBAXi brand).
      { path: '/login', element: <Login /> },
      {
        element: <AuthLayout />,
        children: [
          { path: '/register', element: <Register /> },
          { path: '/setup', element: <Setup /> },
          { path: '/mfa', element: <Mfa /> },
          { path: '/device-pending', element: <Message kind="pending" /> },
          { path: '/blocked', element: <Message kind="blocked" /> },
        ],
      },
      {
        element: <RequireAuth><AppLayout /></RequireAuth>,
        errorElement: <RouteError />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/my-files', element: <MyFiles /> },
          { path: '/shared', element: <Shared /> },
          { path: '/favourites', element: <Favourites /> },
          { path: '/recent', element: <Recent /> },
          { path: '/recycle-bin', element: <RecycleBin /> },
          { path: '/versions', element: <Versions /> },
          // Personal audit log: every user sees only their own activity.
          { path: '/activity', element: <Activity /> },
          { path: '/search', element: <Search /> },
          { path: '/documents', element: <DocumentsIndex /> },
          { path: '/documents/:id', element: <DocumentDetail /> },
          { path: '/documents/:id/compare', element: <Compare /> },
          { path: '/folders', element: <Browse /> },
          { path: '/folders/:id', element: <Browse /> },
          { path: '/folders/:id/history', element: <History /> },
          { path: '/permissions/:kind/:id', element: <Permissions /> },
          { path: '/permissions/:kind/:id/:number', element: <Permissions /> },
          // Every signed-in user has their own email archive; the server only ever returns their own emails.
          { path: '/emails', element: <EmailsIndex /> },
          { path: '/emails/:id', element: <EmailDetail /> },
          { path: '/gmail', element: <GmailSettings /> },
          { path: '/account', element: <Profile /> },
          { path: '/account/mfa', element: <MfaSetup /> },
          { path: '/admin', element: cap('admin', <AdminIndex />) },
          { path: '/admin/users', element: cap('admin', <Users />) },
          { path: '/admin/users/new', element: cap('admin', <UserEdit />) },
          { path: '/admin/users/:id', element: cap('admin', <UserEdit />) },
          { path: '/admin/roles', element: cap('admin', <Roles />) },
          { path: '/admin/roles/new', element: cap('admin', <RoleEdit />) },
          { path: '/admin/roles/:id', element: cap('admin', <RoleEdit />) },
          { path: '/admin/settings', element: cap('admin', <Settings />) },
          { path: '/admin/metadata', element: cap('admin', <Metadata />) },
          { path: '/admin/devices', element: cap('admin', <Devices />) },
          { path: '/admin/mailboxes', element: cap('admin', <Mailboxes />) },
          { path: '*', element: <ErrorPage status={404} title="Not Found" message="The page you were looking for does not exist." /> },
        ],
      },
    ],
  },
])
