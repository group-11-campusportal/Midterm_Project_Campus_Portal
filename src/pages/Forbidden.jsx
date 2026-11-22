import { Link } from 'react-router-dom'

/**
 * 403 Forbidden page displayed when an authenticated user attempts to access
 * a route that is restricted to another role (e.g. a student navigating to an admin route).
 */
function Forbidden({ user }) {
  const isStudent = user?.role === 'client'

  return (
    <main className="not-found" role="alert" aria-labelledby="forbidden-title">
      <div className="card not-found__card">
        <p className="not-found__code">403</p>
        <h1 id="forbidden-title" className="page-title">
          Access Denied
        </h1>
        <p className="page-subtitle">
          {isStudent
            ? 'This area is restricted to university administrators. Your student account does not have authorization to view this resource.'
            : 'You do not have permission to access this page.'}
        </p>
        <div style={{ marginTop: '20px' }}>
          <Link to="/dashboard" className="btn btn--primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Forbidden
