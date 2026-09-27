import { NavLink } from 'react-router-dom'

function buildNavItems(role) {
  const isAdministrator = role === 'administrator'
  return [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/form', label: isAdministrator ? 'Record Grade' : 'Enroll in Course', icon: 'form' },
    { to: '/output', label: isAdministrator ? 'Grade Records' : 'My Submissions', icon: 'output' },
  ]
}

function NavIcon({ name }) {
  if (name === 'dashboard') {
    return (
      <svg className="sidebar__icon" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  if (name === 'form') {
    return (
      <svg className="sidebar__icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 2.5h8l4 4V17.5H4z" />
        <path d="M12 2.5v4h4" />
        <path d="M6.5 13.5h7M6.5 10.5h4" />
      </svg>
    )
  }
  return (
    <svg className="sidebar__icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 4.5h12M4 10h12M4 15.5h12" />
      <circle cx="7" cy="4.5" r="1.6" />
      <circle cx="13" cy="10" r="1.6" />
      <circle cx="9" cy="15.5" r="1.6" />
    </svg>
  )
}

function Sidebar({ user, className, onNavigate }) {
  const navItems = buildNavItems(user?.role)
  return (
    <nav className={className} aria-label="Main menu">
      <ul className="sidebar__nav">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? 'sidebar__link active' : 'sidebar__link')}
              onClick={onNavigate}
            >
              <NavIcon name={item.icon} />
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
