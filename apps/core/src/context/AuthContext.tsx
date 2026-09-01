import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import { permissionsFor, hasPermission as rbacHas } from '@shared/rbac'
import type { AuthPayload, Organization, Permission, Role, SafeUser } from '@shared/types'

interface AuthContextValue {
  user: SafeUser | null
  role: Role | null
  organization: Organization | null
  permissions: Set<Permission>
  hasPermission: (permission: Permission) => boolean
  isAuthenticated: boolean
  initializing: boolean
  impersonating: boolean
  login: (code: string, password: string) => Promise<SafeUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  startSupportView: (target: SafeUser) => Promise<void>
  endSupportView: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<AuthPayload | null>(null)
  const [initializing, setInitializing] = useState(true)

  const load = useCallback(async () => {
    try {
      const p = await api.get<AuthPayload>('/auth/me')
      setPayload(p)
    } catch {
      setPayload(null)
    }
  }, [])

  useEffect(() => {
    load().finally(() => setInitializing(false))
  }, [load])

  // Re-check the session periodically; if it lapsed, drop the user.
  useEffect(() => {
    if (!payload) return
    const id = window.setInterval(() => {
      api.get<AuthPayload>('/auth/me').then(setPayload).catch(() => setPayload(null))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [payload])

  const login = useCallback(async (code: string, password: string) => {
    const p = await api.post<AuthPayload>('/auth/login', { code, password })
    setPayload(p)
    return p.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setPayload(null)
  }, [])

  const refreshUser = useCallback(async () => {
    await load()
  }, [load])

  const startSupportView = useCallback(async (target: SafeUser) => {
    await api.post('/auth/support-view', { targetId: target.id })
    await load()
  }, [load])

  const endSupportView = useCallback(async () => {
    await api.post('/auth/end-support-view').catch(() => {})
    await load()
  }, [load])

  const user = payload?.user ?? null
  const permissions = useMemo(
    () => (payload ? new Set(payload.permissions) : permissionsFor(user)),
    [payload, user],
  )
  const hasPermission = useCallback(
    (p: Permission) => (payload ? payload.permissions.includes(p) || user?.role === 'admin' : rbacHas(user, p)),
    [payload, user],
  )

  const value: AuthContextValue = {
    user,
    role: user?.role ?? null,
    organization: payload?.organization ?? null,
    permissions,
    hasPermission,
    isAuthenticated: Boolean(user),
    initializing,
    impersonating: Boolean(payload?.impersonating),
    login,
    logout,
    refreshUser,
    startSupportView,
    endSupportView,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCurrentUser(): SafeUser {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser used outside an authenticated route')
  return user
}
