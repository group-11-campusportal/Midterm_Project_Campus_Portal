import { NavLink } from 'react-router-dom'

// Menu items change with the logged-in role. The menu strictly
// matches the permission matrix and role boundaries.
function buildNavItems(role) {
  const isAdministrator = role === 'administrator'

  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    // Administrator: review enrollment requests, like the mobile Enrollments tab.
    ...(isAdministrator ? [{ to: '/enrollments', label: 'Enrollments', icon: 'enrollments' }] : []),
    // Administrators record grades from the Grade Records page (Record Grade button),
    // so the separate "Record Grade" tab is only the students' "Enroll in Course".
    ...(isAdministrator ? [] : [{ to: '/form', label: 'Enroll in Course', icon: 'form' }]),
    {
      to: '/output',
      label: isAdministrator ? 'Grade Records' : 'My Grades',
      icon: 'output',
    },
  ]

  if (isAdministrator) {
    items.push({
      to: '/ai-advisor',
      label: 'AI Advisor',
      icon: 'ai',
    })
  } else {
    items.push({
      to: '/course-recommendation',
      label: 'Course Recommendation',
      icon: 'ai',
    })
  }

  items.push({ to: '/profile', label: 'Profile', icon: 'profile' })

  return items
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

  if (name === 'enrollments') {
    return (
      <svg className="sidebar__icon" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="4.5" y="3.5" width="11" height="14" rx="2" />
        <path d="M7.5 3.5v-1h5v1" />
        <path d="M7.5 9.5l1.8 1.8 3.4-3.6" />
      </svg>
    )
  }

  if (name === 'profile') {
    return (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="6.5" r="3.5" />
        <path d="M3 17.5c.8-3.3 3.6-5 7-5s6.2 1.7 7 5" />
      </svg>
    )
  }

  if (name === 'ai') {
    return (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2v3m0 10v3M2 10h3m10 0h3M4.93 4.93l2.12 2.12m5.9 5.9l2.12 2.12M4.93 15.07l2.12-2.12m5.9-5.9l2.12-2.12" />
        <circle cx="10" cy="10" r="2.5" />
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
              className={({ isActive }) =>
                isActive ? 'sidebar__link active' : 'sidebar__link'
              }
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
