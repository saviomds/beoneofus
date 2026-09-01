import { organizationsRepo, usersRepo, studentsRepo } from '../lib/db'
import type { Id, Organization, SafeUser, Student, User } from '@shared/types'
import { assertPermission, hasPermission, PERMISSIONS } from '@shared/rbac'
import { scopeRows, assertTenant, tenantScope, actingOrgId } from '../lib/tenant'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

export { assertPermission, hasPermission, PERMISSIONS, scopeRows, assertTenant, tenantScope, actingOrgId, auditService, notificationService }

/** Org list — needed for government (province/district) tenant scoping. */
export async function loadOrgs(): Promise<Organization[]> {
  return (await organizationsRepo.list()) as Organization[]
}

export async function nameOf(id: Id | null | undefined): Promise<string> {
  if (!id) return 'System'
  const u = (await usersRepo.get(id)) as User | null
  if (u) return u.name
  const s = (await studentsRepo.get(id)) as Student | null
  if (s) return `${s.firstName} ${s.lastName}`
  return String(id)
}

export async function usersByIds(ids: Id[]): Promise<SafeUser[]> {
  const set = new Set(ids)
  const all = (await usersRepo.list()) as User[]
  return all
    .filter((u) => set.has(u.id))
    .map((u) => {
      const { passwordHash: _h, passwordSalt: _s, ...safe } = u
      void _h
      void _s
      return safe
    })
}

export function paginate<T>(rows: T[], page = 1, limit = 25) {
  const total = rows.length
  const start = (Math.max(1, page) - 1) * limit
  return { rows: rows.slice(start, start + limit), total, page, limit }
}

/** Sort newest-updated first. */
export function recent<T extends { updatedAt?: string; createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const av = a.updatedAt ?? a.createdAt ?? ''
    const bv = b.updatedAt ?? b.createdAt ?? ''
    return av < bv ? 1 : -1
  })
}
