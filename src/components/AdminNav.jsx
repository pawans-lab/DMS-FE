import { Link, NavLink, useLocation } from 'react-router-dom'

/** admin/_nav.html. */
export default function AdminNav() {
  const { pathname } = useLocation()
  const tab = (to, text, active) => <NavLink to={to} end className={() => (active ? 'active' : '')}>{text}</NavLink>
  return (
    <nav className="tabs" aria-label="Administration">
      {tab('/admin', 'Overview', pathname === '/admin')}
      {tab('/admin/users', 'Users', pathname.startsWith('/admin/users'))}
      {tab('/admin/roles', 'Roles', pathname.startsWith('/admin/roles'))}
      <Link to="/permissions/repository/0">Repository permissions</Link>
      {tab('/admin/metadata', 'Metadata & tags', pathname === '/admin/metadata')}
      {tab('/admin/settings', 'Settings', pathname === '/admin/settings')}
      {tab('/admin/devices', 'Devices', pathname === '/admin/devices')}
      {tab('/admin/mailboxes', 'Mailboxes', pathname === '/admin/mailboxes')}
    </nav>
  )
}
