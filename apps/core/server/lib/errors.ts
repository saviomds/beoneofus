// Typed errors that map cleanly onto HTTP status codes in server/app.ts.

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string, readonly details?: unknown) {
    super(message, 422, 'VALIDATION')
  }
}

export class NotFoundError extends AppError {
  constructor(what = 'Resource') {
    super(`${what} was not found.`, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The record was modified by someone else. Reload and try again.') {
    super(message, 409, 'CONFLICT')
  }
}

export class TenantError extends AppError {
  constructor(message = 'This resource belongs to a different organization.') {
    super(message, 403, 'TENANT_FORBIDDEN')
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    readonly kind: 'unauthenticated' | 'bad_credentials' | 'locked' | 'inactive' = 'unauthenticated',
  ) {
    super(message, kind === 'unauthenticated' ? 401 : 403, kind === 'unauthenticated' ? 'UNAUTHENTICATED' : 'AUTH')
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many attempts. Please wait and try again.') {
    super(message, 429, 'RATE_LIMITED')
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 500, 'STORAGE')
  }
}

export class RecoveryError extends AppError {
  constructor(message: string) {
    super(message, 503, 'RECOVERY')
  }
}

/** Narrow an unknown thrown value to an AppError-ish shape. */
export function toHttp(err: unknown): { status: number; code: string; message: string; details?: unknown } {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: (err as ValidationError).details }
  }
  // AuthorizationError from shared/rbac.ts carries status/code fields
  if (err && typeof err === 'object' && 'status' in err && 'code' in err) {
    const e = err as { status: number; code: string; message?: string }
    return { status: e.status, code: e.code, message: e.message ?? 'Forbidden' }
  }
  if (err instanceof Error && err.name === 'AuthorizationError') {
    return { status: 403, code: 'FORBIDDEN', message: err.message }
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error'
  return { status: 500, code: 'INTERNAL', message }
}
