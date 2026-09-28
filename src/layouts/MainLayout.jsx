import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

// The application shell: header + side menu + main content + footer.
// It is the "menu / navigation" page required by the brief.
function MainLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(() => window.location.hash.includes('drawer=true'))

  function handleToggleSidebar() {
    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches
    if (isSmallScreen) {
      setMobileOpen((open) => !open)
    } else {
      setCollapsed((value) => !value)
    }
  }

  const sidebarClassName = [
    'sidebar',
    collapsed ? 'sidebar--collapsed' : '',
    mobileOpen ? 'sidebar--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onLogout={onLogout}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="app-body">
        <Sidebar
          user={user}
          className={sidebarClassName}
          onNavigate={() => setMobileOpen(false)}
        />

        <main className="content">
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <p>University Campus Portal · Web &amp; Mobile Application Development</p>
        <p>Front-end demo · all data is hardcoded</p>
      </footer>
    </div>
  )
}

export default MainLayout
