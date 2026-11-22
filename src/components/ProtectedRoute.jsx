import { Navigate, useLocation } from 'react-router-dom'
import Forbidden from '../pages/Forbidden'

/**
 * Route protection wrapper:
 * 1. Blocks unauthenticated visitors and redirects to /login.
 * 2. Blocks users who lack the required role (e.g. students accessing admin routes)
 *    and renders the 403 Forbidden page.
 */
function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Forbidden user={user} />
  }

  return children
}

export default ProtectedRoute
