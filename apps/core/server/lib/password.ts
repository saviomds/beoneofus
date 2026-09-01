import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto'

/**
 * scrypt password hashing (Node built-in, no dependency). Format stored on the
 * user record: `passwordSalt` (hex) + `passwordHash` (hex of scrypt output).
 * Replaces the old non-cryptographic djb2 hash.
 */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): {
  hash: string
  salt: string
} {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  if (!salt || !expectedHash) return false
  try {
    const actual = scryptSync(password, salt, 64)
    const expected = Buffer.from(expectedHash, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** Opaque token → stored hash. Used for invitation tokens and session ids. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}
