// ---------------------------------------------------------------------------
// Tenant isolation. `hasPermission` answers "may this user perform this ACTION";
// this module answers "does this RECORD belong to a tenant the user may see".
// Both checks must pass. Every service list/get/create/update/remove runs
// scopeRows / assertTenant. Route params are never trusted — the record is
// loaded, then assertTenant(user, record) before it is returned.
// ---------------------------------------------------------------------------

import type { Organization, SafeUser } from '@shared/types'
import { TenantError } from './errors'

export interface TenantScope {
  /** platform admins: see everything */
  all: boolean
  /** institution users: exactly this org */
  organizationId?: string
  /** government: a policy-scoped view of many orgs (district/region/national) */
  government?: {
    level: 'NATIONAL' | 'REGIONAL' | 'DISTRICT'
    provinces: string[]
    districts: string[]
  }
}

export function tenantScope(user: SafeUser | null): TenantScope {
  if (!user) return { all: false }
  if (user.role === 'admin') return { all: true }
  if (user.role === 'government') {
    const g = user.govScope
    return {
      all: false,
      government: {
        level: g?.level ?? 'NATIONAL',
        provinces: g?.provinces ?? [],
        districts: g?.districts ?? [],
      },
    }
  }
  return { all: false, organizationId: user.organizationId ?? '__none__' }
}

/** Is `organizationId` within the caller's tenant scope? Needs the org list for gov scoping. */
export function inScope(scope: TenantScope, organizationId: string | null | undefined, orgs?: Organization[]): boolean {
  if (scope.all) return true
  if (!organizationId) return false
  if (scope.organizationId) return scope.organizationId === organizationId
  if (scope.government) {
    if (scope.government.level === 'NATIONAL') return true
    const org = orgs?.find((o) => o.id === organizationId)
    if (!org) return false
    if (scope.government.level === 'REGIONAL') return scope.government.provinces.includes(org.province)
    return scope.government.districts.includes(org.district)
  }
  return false
}

/** Filter a list of tenant-owned rows to the caller's scope. */
export function scopeRows<T extends { organizationId?: string | null }>(
  user: SafeUser | null,
  rows: T[],
  orgs?: Organization[],
): T[] {
  const scope = tenantScope(user)
  if (scope.all) return rows
  return rows.filter((r) => inScope(scope, r.organizationId, orgs))
}

/** Throw 403 unless the single record is in the caller's tenant scope. */
export function assertTenant(
  user: SafeUser | null,
  record: { organizationId?: string | null } | null | undefined,
  orgs?: Organization[],
): void {
  if (!record) return // let NotFound handle absence
  if (!inScope(tenantScope(user), record.organizationId, orgs)) {
    throw new TenantError()
  }
}

/** The org a mutating institution user is acting within (never taken from the client). */
export function actingOrgId(user: SafeUser): string {
  if (!user.organizationId) throw new TenantError('This account is not attached to an institution.')
  return user.organizationId
}
