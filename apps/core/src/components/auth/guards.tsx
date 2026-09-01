import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Permission, Role } from '@/types'
import { Unauthorized } from '@/pages/system/Unauthorized'
import { AccountInactive } from '@/pages/system/AccountInactive'

function Checking() {
  return <div className="route-splash">Checking your session…</div>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing, user } = useAuth()
  const location = useLocation()
  if (initializing) return <Checking />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (user && user.status !== 'active') return <AccountInactive />
  return <>{children}</>
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { initializing, role, isAuthenticated } = useAuth()
  const location = useLocation()
  if (initializing) return <Checking />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!role || !roles.includes(role)) return <Unauthorized needed={roles} />
  return <>{children}</>
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { initializing, hasPermission, isAuthenticated } = useAuth()
  if (initializing) return <Checking />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!hasPermission(permission)) return <Unauthorized />
  return <>{children}</>
}

/** Render children only when the current user holds the permission. */
export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { hasPermission } = useAuth()
  return hasPermission(permission) ? <>{children}</> : null
}
