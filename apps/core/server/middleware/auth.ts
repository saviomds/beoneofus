import type { RequestHandler } from 'express'
import { authService } from '../services/authService'
import { AuthError } from '../lib/errors'
import { hasPermission } from '@shared/rbac'
import type { Permission, Role } from '@shared/types'

export const COOKIE_NAME = 'bou_sid'

/** Runs on every request: resolves the session cookie into req.user. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  req.ctx = {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local',
    userAgent: req.headers['user-agent'] ?? '',
  }
  req.sessionId = req.cookies?.[COOKIE_NAME]
  req.user = null
  req.session = null
  try {
    const resolved = await authService.resolveSession(req.sessionId)
    if (resolved) {
      req.user = resolved.user
      req.session = resolved.session
    }
  } catch {
    /* treat as anonymous */
  }
  next()
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AuthError('Please sign in.', 'unauthenticated'))
  if (req.user.status !== 'active') return next(new AuthError(`This account is ${req.user.status}.`, 'inactive'))
  next()
}

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError('Please sign in.', 'unauthenticated'))
    if (!hasPermission(req.user, permission)) {
      return next(new AuthError(`Not authorized: ${permission} required.`, 'bad_credentials'))
    }
    next()
  }
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError('Please sign in.', 'unauthenticated'))
    if (!roles.includes(req.user.role)) return next(new AuthError('Not authorized for this area.', 'bad_credentials'))
    next()
  }
}
