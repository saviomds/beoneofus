import { usersRepo, organizationsRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService, notificationService, paginate, recent } from './_shared'
import { ROLE_PERMISSIONS } from '@shared/rbac'
import { ValidationError, NotFoundError } from '../lib/errors'
import { hashPassword } from '../lib/password'
import { toSafeUser } from './authService'
import type { Id, Role, SafeUser, User, UserStatus } from '@shared/types'

export const userService = {
  async list(actor: SafeUser, q: { page?: number; limit?: number; role?: Role; status?: UserStatus; organizationId?: Id; search?: string } = {}) {
    assertPermission(actor, P.USERS_MANAGE)
    let rows = ((await usersRepo.list()) as User[]).map(toSafeUser)
    if (q.role) rows = rows.filter((u) => u.role === q.role)
    if (q.status) rows = rows.filter((u) => u.status === q.status)
    if (q.organizationId) rows = rows.filter((u) => u.organizationId === q.organizationId)
    if (q.search) {
      const s = q.search.toLowerCase()
      rows = rows.filter((u) => `${u.name} ${u.code} ${u.email}`.toLowerCase().includes(s))
    }
    return paginate(recent(rows), q.page, q.limit)
  },

  async get(actor: SafeUser, id: Id): Promise<SafeUser> {
    assertPermission(actor, P.USERS_MANAGE)
    const u = (await usersRepo.get(id)) as User | null
    if (!u) throw new NotFoundError('User')
    return toSafeUser(u)
  },

  async create(
    actor: SafeUser,
    input: Pick<User, 'role' | 'name' | 'email' | 'phone'> & Partial<Pick<User, 'organizationId' | 'status' | 'organizationRole'>> & { code?: string },
  ): Promise<SafeUser> {
    assertPermission(actor, P.USERS_MANAGE)
    if (input.organizationId) {
      const org = await organizationsRepo.get(input.organizationId)
      if (!org) throw new ValidationError('Unknown organization.')
    }
    const prefix = { student: 'BOU-STU-RW', teacher: 'BOU-TEA-RW', mentor: 'BOU-MEN-RW', guardian: 'BOU-GDN', school: 'BOU-ORG-RW', government: 'BOU-GOV', admin: 'BOU-ADM' }[input.role]
    const code = input.code || `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`
    const { hash, salt } = hashPassword('demo123')
    const created = (await usersRepo.create({
      code, passwordHash: hash, passwordSalt: salt, role: input.role,
      organizationRole: input.organizationRole ?? (input.role === 'school' ? 'admin' : input.role === 'teacher' ? 'teacher' : input.role === 'student' ? 'student' : null),
      status: input.status ?? 'pending', name: input.name, email: input.email, phone: input.phone,
      avatar: null, lastLogin: null, failedLogins: 0, lockedUntil: null, permissions: [],
      organizationId: input.organizationId ?? null, govScope: input.role === 'government' ? { level: 'NATIONAL' } : null,
    }, actor.id)) as User
    await auditService.record({ actor, action: 'USER_CREATED', targetId: created.id, targetType: 'user', organizationId: created.organizationId, metadata: { role: created.role, code } })
    return toSafeUser(created)
  },

  async update(actor: SafeUser, id: Id, patch: Partial<User>): Promise<SafeUser> {
    assertPermission(actor, P.USERS_MANAGE)
    if (id === actor.id && patch.role && patch.role !== actor.role) throw new ValidationError('You cannot change your own role.')
    const { passwordHash: _p, passwordSalt: _s, version: _v, ...safe } = patch
    void _p; void _s; void _v
    const updated = (await usersRepo.update(id, safe, { actorId: actor.id })) as User
    await auditService.record({ actor, action: 'USER_UPDATED', targetId: id, targetType: 'user', organizationId: updated.organizationId, metadata: { fields: Object.keys(safe) } })
    return toSafeUser(updated)
  },

  async setStatus(actor: SafeUser, id: Id, status: UserStatus): Promise<SafeUser> {
    assertPermission(actor, P.USERS_MANAGE)
    if (id === actor.id && status !== 'active') throw new ValidationError('You cannot deactivate your own account.')
    const updated = (await usersRepo.update(id, { status }, { actorId: actor.id })) as User
    await auditService.record({ actor, action: `USER_${status.toUpperCase()}`, targetId: id, targetType: 'user', organizationId: updated.organizationId })
    await notificationService.create({ recipientId: id, type: 'security', title: 'Account status changed', message: `Your account is now ${status}.`, actionUrl: null })
    return toSafeUser(updated)
  },

  async setPermissions(actor: SafeUser, id: Id, permissions: string[]): Promise<SafeUser> {
    assertPermission(actor, P.USERS_MANAGE)
    const updated = (await usersRepo.update(id, { permissions }, { actorId: actor.id })) as User
    await auditService.record({ actor, action: 'PERMISSIONS_CHANGED', targetId: id, targetType: 'user', organizationId: updated.organizationId, metadata: { permissions } })
    return toSafeUser(updated)
  },

  rolePermissions(role: Role): string[] {
    return ROLE_PERMISSIONS[role] ?? []
  },

  async counts(actor: SafeUser): Promise<Record<string, number>> {
    assertPermission(actor, P.USERS_MANAGE)
    const rows = (await usersRepo.list()) as User[]
    const by = (fn: (u: User) => boolean) => rows.filter(fn).length
    return {
      total: rows.length,
      active: by((u) => u.status === 'active'),
      pending: by((u) => u.status === 'pending'),
      suspended: by((u) => u.status === 'suspended'),
      students: by((u) => u.role === 'student'),
      teachers: by((u) => u.role === 'teacher'),
      mentors: by((u) => u.role === 'mentor'),
      institutions: by((u) => u.role === 'school'),
      government: by((u) => u.role === 'government'),
    }
  },
}
