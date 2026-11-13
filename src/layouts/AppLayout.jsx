import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import { useModals } from '../components/modals/modalContext'
import SearchBox from '../components/SearchBox'
import { initial } from '../lib/format'

/** Closes open `details.menu` dropdowns on an outside click or a menu item click (app.js). */
function useMenuCloser() {
  useEffect(() => {
    const onClick = (e) => {
      document.querySelectorAll('details.menu[open]').forEach((d) => {
        if (!d.contains(e.target) || e.target.closest('.menu-list button, .menu-list a')) d.open = false
      })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}

/** base.html: sidebar, topbar and <main>. */
export default function AppLayout() {
  const { user, label, has, appName, signOut } = useAuth()
  const { currentFolder } = useModals()
  const { pathname } = useLocation()
  // The mobile sidebar is open for the page it was opened on; navigating closes it.
  const [openOn, setOpenOn] = useState(null)
  const sidebarOpen = openOn === pathname
  useMenuCloser()

  const inHome = !!(currentFolder && currentFolder.inHome && pathname.startsWith('/folders'))
  const docPage = pathname === '/documents' || /^\/documents\/\d+(\/compare)?$/.test(pathname)
  const item = (to, icon, text, active) => (
    <NavLink to={to} end className={() => (active ? 'active' : '')}><Icon name={icon} /> {text}</NavLink>
  )

  return (
    <div className="layout">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
        <NavLink className="brand" to="/">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>{appName}</span>
        </NavLink>
        <nav className="nav">
          {item('/', 'home', 'Home', pathname === '/')}
          <div className="nav-section">Document Library</div>
          {item('/my-files', 'folder', 'My Files', inHome)}
          {item('/shared', 'share', 'Shared with me', pathname === '/shared')}
          {item('/folders', 'users', 'Shared library', pathname.startsWith('/folders') && !inHome)}
          {item('/favourites', 'star', 'Favourites', pathname === '/favourites')}
          {item('/recent', 'clock', 'Recent', pathname === '/recent')}
          {item('/recycle-bin', 'trash', 'Recycle Bin', pathname === '/recycle-bin')}
          <div className="nav-section">Find</div>
          {item('/search', 'search', 'Search', pathname.startsWith('/search'))}
          {item('/documents', 'file', 'All Documents', docPage)}
          <div className="nav-section">Email Archive</div>
          {item('/emails', 'mail', 'My Archived Emails', pathname.startsWith('/emails'))}
          {item('/gmail', 'link', 'Gmail Connection', pathname.startsWith('/gmail'))}
          <div className="nav-section">Account</div>
          {item('/activity', 'activity', 'My Activity Log', pathname === '/activity')}
          {has('admin') && (
            <>
              <div className="nav-section">Administration</div>
              {item('/admin', 'settings', 'Admin Console', pathname.startsWith('/admin'))}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <>
              <NavLink to="/account" className="gmail-pill is-on">
                <span className="avatar">{initial(label)}</span>
                <span className="gmail-pill-text"><strong>{label}</strong><small>{user.roles.join(', ') || 'No role'}</small></span>
              </NavLink>
              <span className="inline-form" style={{ display: 'flex' }}>
                <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={signOut}><Icon name="logout" /> Sign out</button>
              </span>
            </>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-toggle" aria-label="Menu" aria-expanded={sidebarOpen}
            aria-controls="sidebar" onClick={() => setOpenOn(sidebarOpen ? null : pathname)}><Icon name="menu" /></button>
          <SearchBox />
        </header>
        <main className="content">
          <Suspense fallback={<Loading />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
