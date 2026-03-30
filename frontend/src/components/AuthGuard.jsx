import { Navigate, Outlet } from 'react-router-dom'
import { useGameStore } from '../store'

/**
 * AuthGuard — protects routes that require authentication.
 * Redirects to /login if the user is not authenticated.
 */
export function RequireAuth({ children }) {
  const isAuthenticated = useGameStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * GuestGuard — for pages like /login and /register.
 * Redirects to / if the user is already authenticated.
 */
export function GuestOnly({ children }) {
  const isAuthenticated = useGameStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children ?? <Outlet />
}

/**
 * AdminGuard — for admin-only pages.
 * Redirects to / if the user is not an admin.
 */
export function RequireAdmin({ children }) {
  const isAuthenticated = useGameStore((s) => s.isAuthenticated)
  const isAdmin = useGameStore((s) => s.isAdmin)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}
