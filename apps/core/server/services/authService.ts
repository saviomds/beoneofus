import { usersRepo, organizationsRepo, authSessionsRepo } from '../lib/db'
import { hashPassword, verifyPassword } from '../lib/password'
import { AuthError, NotFoundError, ValidationError } from '../lib/errors'
import { permissionsFor } from '@shared/rbac'
import { ROLE_CODE_PREFIX } from '@shared/types'
import type { AuthPayload, Id, Organization, Role, SafeUser, SessionRecord, User } from '@shared/types'
import { auditService } from './auditService'
import { nanoid } from 'nanoid'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8h
const MAX_FAILED = 5
const LOCK_MS = 10 * 60 * 1000

const ROTATING_CODE_ROLES: Role[] = ['government']

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = u
  void _h
  void _s
  return safe
}

export function roleFromCode(code: string): Role | null {
  const prefix = code.trim().toUpperCase().split('-').slice(0, 2).join('-')
  return ROLE_CODE_PREFIX[prefix] ?? null
}

export function rotateCodeValue(currentCode: string): string {
  const prefix = currentCode.trim().toUpperCase().split('-').slice(0, 2).join('-')
  return `${prefix}-${Math.floor(10000 + Math.random() * 89999)}`
}

interface Ctx {
  ip: string
  userAgent: string
}

export const authService = {
  async findByCode(code: string): Promise<User | null> {
    const all = (await usersRepo.list()) as User[]
    return all.find((u) => u.code.toLowerCase() === code.trim().toLowerCase()) ?? null
  },

  async login(code: string, password: string, ctx: Ctx): Promise<{ safe: SafeUser; sessionId: string; expiresAt: number }> {
    const user = await this.findByCode(code)
    if (!user) {
      await auditService.record({ actor: { id: code || 'unknown', role: 'system' }, action: 'LOGIN_FAILED', result: 'DENIED', ip: ctx.ip, metadata: { reason: 'not_found', code } })
      throw new AuthError("We couldn't find an account with that code.", 'bad_credentials')
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      throw new AuthError('This account is temporarily locked after repeated failed sign-ins. Try again later.', 'locked')
    }

    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      const failed = (user.failedLogins ?? 0) + 1
      const patch: Partial<User> = { failedLogins: failed }
      if (failed >= MAX_FAILED) patch.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString()
      await usersRepo.update(user.id, patch, { actorId: 'system' })
      await auditService.record({ actor: { id: user.id, role: user.role, organizationId: user.organizationId }, action: 'LOGIN_FAILED', result: 'DENIED', ip: ctx.ip, metadata: { reason: 'bad_password', failed } })
      throw new AuthError('Incorrect password. Please try again.', 'bad_credentials')
    }

    if (user.status !== 'active') {
      await auditService.record({ actor: { id: user.id, role: user.role, organizationId: user.organizationId }, action: 'LOGIN_BLOCKED', result: 'DENIED', ip: ctx.ip, metadata: { status: user.status } })
      throw new AuthError(`This account is ${user.status}. Contact your administrator to restore access.`, 'inactive')
    }

    // Institution accounts require an ACTIVE organization.
    if (user.organizationId && user.role !== 'admin' && user.role !== 'government') {
      const org = (await organizationsRepo.get(user.organizationId)) as Organization | null
      if (org && org.status !== 'ACTIVE') {
        await auditService.record({ actor: { id: user.id, role: user.role, organizationId: user.organizationId }, action: 'LOGIN_BLOCKED', result: 'DENIED', ip: ctx.ip, metadata: { orgStatus: org.status } })
        throw new AuthError(`Your institution is ${org.status.toLowerCase()}. Access is not yet available.`, 'inactive')
      }
    }

    const patch: Partial<User> = { lastLogin: new Date().toISOString(), failedLogins: 0, lockedUntil: null }
    let rotatedFrom: string | null = null
    if (ROTATING_CODE_ROLES.includes(user.role)) {
      rotatedFrom = user.code
      patch.code = rotateCodeValue(user.code)
    }
    await usersRepo.update(user.id, patch, { actorId: 'system' })
    const fresh = (await usersRepo.get(user.id)) as User
    const safe = toSafeUser(fresh)

    const now = Date.now()
    const expiresAt = now + SESSION_TTL_MS
    const session = (await authSessionsRepo.create({
      id: nanoid(32),
      userId: safe.id,
      createdAt: now,
      expiresAt,
      ip: ctx.ip,
      userAgent: ctx.userAgent.slice(0, 200),
      impersonatorId: null,
    })) as SessionRecord

    await auditService.record({ actor: { id: safe.id, role: safe.role, organizationId: safe.organizationId }, action: 'LOGIN', targetId: safe.id, targetType: 'user', ip: ctx.ip })
    if (rotatedFrom) {
      await auditService.record({ actor: { id: safe.id, role: safe.role, organizationId: safe.organizationId }, action: 'ACCESS_CODE_ROTATED', targetId: safe.id, targetType: 'user', ip: ctx.ip, metadata: { from: rotatedFrom, to: safe.code, trigger: 'login' } })
    }
    return { safe, sessionId: session.id, expiresAt }
  },

  async resolveSession(sessionId: string | undefined): Promise<{ user: SafeUser; session: SessionRecord } | null> {
    if (!sessionId) return null
    const session = (await authSessionsRepo.get(sessionId)) as SessionRecord | null
    if (!session) return null
    if (Date.now() > session.expiresAt) {
      await authSessionsRepo.remove(sessionId)
      return null
    }
    const user = (await usersRepo.get(session.userId)) as User | null
    if (!user || user.status !== 'active') return null
    // sliding expiry
    if (session.expiresAt - Date.now() < SESSION_TTL_MS / 2) {
      await authSessionsRepo.update(sessionId, { expiresAt: Date.now() + SESSION_TTL_MS }, { actorId: 'system' })
    }
    return { user: toSafeUser(user), session }
  },

  async logout(sessionId: string | undefined, actor: SafeUser | null): Promise<void> {
    if (sessionId) await authSessionsRepo.remove(sessionId)
    if (actor) await auditService.record({ actor, action: 'LOGOUT', targetId: actor.id, targetType: 'user' })
  },

  async me(user: SafeUser, session: SessionRecord): Promise<AuthPayload> {
    const organization = user.organizationId
      ? ((await organizationsRepo.get(user.organizationId)) as Organization | null)
      : null
    return {
      user,
      permissions: [...permissionsFor(user)],
      organization,
      impersonating: Boolean(session.impersonatorId),
      expiresAt: session.expiresAt,
    }
  },

  async changePassword(actor: SafeUser, current: string, next: string): Promise<void> {
    if (!next || next.length < 6) throw new ValidationError('New password must be at least 6 characters.')
    const user = (await usersRepo.get(actor.id)) as User | null
    if (!user || !verifyPassword(current, user.passwordSalt, user.passwordHash)) {
      throw new AuthError('Your current password is incorrect.', 'bad_credentials')
    }
    const { hash, salt } = hashPassword(next)
    await usersRepo.update(actor.id, { passwordHash: hash, passwordSalt: salt }, { actorId: actor.id })
    await auditService.record({ actor, action: 'PASSWORD_CHANGED', targetId: actor.id, targetType: 'user' })
  },

  async rotateCode(actor: SafeUser): Promise<string> {
    const next = rotateCodeValue(actor.code)
    await usersRepo.update(actor.id, { code: next }, { actorId: actor.id })
    await auditService.record({ actor, action: 'ACCESS_CODE_ROTATED', targetId: actor.id, targetType: 'user', metadata: { from: actor.code, to: next, trigger: 'manual' } })
    return next
  },

  async startSupportView(admin: SafeUser, targetId: Id, ctx: Ctx): Promise<{ sessionId: string; expiresAt: number }> {
    const target = (await usersRepo.get(targetId)) as User | null
    if (!target) throw new NotFoundError('User')
    const now = Date.now()
    const expiresAt = now + SESSION_TTL_MS
    const session = (await authSessionsRepo.create({
      id: nanoid(32), userId: targetId, createdAt: now, expiresAt,
      ip: ctx.ip, userAgent: ctx.userAgent.slice(0, 200), impersonatorId: admin.id,
    })) as SessionRecord
    await auditService.record({ actor: admin, action: 'SUPPORT_VIEW_STARTED', targetId, targetType: 'user' })
    return { sessionId: session.id, expiresAt }
  },

  async endSupportView(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return
    const session = (await authSessionsRepo.get(sessionId)) as SessionRecord | null
    if (session?.impersonatorId) {
      await auditService.record({ actor: { id: session.impersonatorId, role: 'admin' }, action: 'SUPPORT_VIEW_ENDED', targetId: session.userId, targetType: 'user' })
    }
    await authSessionsRepo.remove(sessionId)
  },

  sessionTtlMs: SESSION_TTL_MS,
}
