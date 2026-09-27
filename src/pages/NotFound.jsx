import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <main className="not-found">
      <div className="card not-found__card">
        <p className="not-found__code">404</p>
        <h1 className="page-title">Page not found</h1>
        <p className="page-subtitle">The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="btn btn--primary">Back to Dashboard</Link>
      </div>
    </main>
  )
}

export default NotFound
