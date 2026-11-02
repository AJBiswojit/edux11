import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

/**
 * Route guard: requires authentication and (optionally) a specific role.
 * Unauthenticated users are sent to /auth/login with a return path;
 * role mismatches render the 403 page instead of silently redirecting.
 */
function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/403" replace state={{ from: location }} />
  }

  return children
}

export { ProtectedRoute }
export default ProtectedRoute
