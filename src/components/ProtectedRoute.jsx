import { Navigate, useLocation } from 'react-router-dom'

// Blocks the inner pages until someone is logged in.
// Unauthenticated visitors are sent to /login, and remember where
// they were heading so login can send them back.
function ProtectedRoute({ user, children }) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
