import { organizationsRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, scopeRows, tenantScope, auditService, loadOrgs, recent } from './_shared'
import { NotFoundError, TenantError } from '../lib/errors'
import type { Id, OrgStatus, Organization, SafeUser } from '@shared/types'

async function require(id: Id): Promise<Organization> {
  const o = (await organizationsRepo.get(id)) as Organization | null
  if (!o) throw new NotFoundError('Organization')
  return o
}

export const organizationService = {
  /** Every organization the caller may see. */
  async list(actor: SafeUser): Promise<Organization[]> {
    assertPermission(actor, P.INSTITUTION_VIEW)
    const rows = (await organizationsRepo.list()) as Organization[]
    const scope = tenantScope(actor)
    if (scope.all) return recent(rows)
    if (scope.organizationId) return recent(rows.filter((o) => o.id === scope.organizationId))
    // government: scope by province/district
    return recent(scopeRows(actor, rows.map((o) => ({ ...o, organizationId: o.id })), rows) as Organization[])
  },

  async get(actor: SafeUser, id: Id): Promise<Organization> {
    const org = await require(id)
    assertTenant(actor, { organizationId: org.id }, await loadOrgs())
    return org
  },

  /** The caller's own institution. */
  async mine(actor: SafeUser): Promise<Organization | null> {
    if (!actor.organizationId) return null
    return (await organizationsRepo.get(actor.organizationId)) as Organization | null
  },

  async update(actor: SafeUser, id: Id, patch: Partial<Organization>, expectedVersion?: number): Promise<Organization> {
    const org = await require(id)
    if (actor.role !== 'admin' && actor.organizationId !== org.id) throw new TenantError()
    assertPermission(actor, P.INSTITUTION_EDIT)
    // profile edits only — status changes go through the admin lifecycle methods
    const { status: _s, id: _i, version: _v, ...safe } = patch
    void _s
    void _i
    void _v
    const updated = (await organizationsRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as Organization
    await auditService.record({ actor, action: 'ORGANIZATION_UPDATED', targetId: id, targetType: 'organization', organizationId: id, metadata: { fields: Object.keys(safe) } })
    return updated
  },

  async setStatus(actor: SafeUser, id: Id, status: OrgStatus, note = ''): Promise<Organization> {
    const perm = status === 'ACTIVE' ? P.ORG_APPROVE : P.ORG_SUSPEND
    assertPermission(actor, perm)
    await require(id)
    const updated = (await organizationsRepo.update(id, { status }, { actorId: actor.id })) as Organization
    await auditService.record({ actor, action: `ORGANIZATION_${status}`, targetId: id, targetType: 'organization', organizationId: id, metadata: { note } })
    return updated
  },

  async create(actor: SafeUser, dto: Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Organization> {
    assertPermission(actor, P.ORG_CREATE)
    const created = (await organizationsRepo.create({ ...dto, authorizedBy: actor.id }, actor.id)) as Organization
    await auditService.record({ actor, action: 'ORGANIZATION_CREATED', targetId: created.id, targetType: 'organization', organizationId: created.id })
    return created
  },
}
