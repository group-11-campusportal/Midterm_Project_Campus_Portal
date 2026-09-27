import logo from '../assets/logo.svg'

function Navbar({ user, onLogout, onToggleSidebar }) {
  return (
    <header className="navbar">
      <button type="button" className="navbar__toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="navbar__brand">
        <img src={logo} alt="" width="28" height="28" />
        <span>Campus Portal</span>
      </div>

      <div className="navbar__spacer" />

      {user ? (
        <div className="navbar__account">
          <div className="navbar__identity">
            <span className="navbar__name">{user.name}</span>
            <span className="navbar__role">{user.role}</span>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
