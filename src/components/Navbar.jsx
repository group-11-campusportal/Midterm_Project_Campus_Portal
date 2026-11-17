import logo from '../assets/logo.svg'

function Navbar({ user, onLogout, onToggleSidebar }) {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CP'

  const isAdministrator = user?.role === 'administrator'

  return (
    <header className="navbar">
      <button
        type="button"
        className="navbar__toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="navbar__brand">
        <img src={logo} alt="" width="28" height="28" />
        <span className="navbar__brand-text">Campus Portal</span>
      </div>

      <div className="navbar__spacer" />

      {user ? (
        <div className="navbar__account">
          <div className="navbar__avatar" title={user.name}>
            <span>{initials}</span>
          </div>
          <div className="navbar__identity">
            <span className="navbar__name">{user.name}</span>
            <span className={`navbar__role-pill ${isAdministrator ? 'navbar__role-pill--admin' : ''}`}>
              {isAdministrator ? 'Administrator' : 'Student'}
            </span>
          </div>
          <button type="button" className="btn btn--ghost navbar__logout-btn" onClick={onLogout} title="Log out">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true">
              <path d="M13 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M9 14l4-4-4-4M13 10H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="navbar__logout-text">Log out</span>
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
