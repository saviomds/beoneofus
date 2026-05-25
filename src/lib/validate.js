/**
 * Lightweight input validation helpers — no external dependency needed.
 * Drop-in for API routes until you add Zod (recommended for complex schemas).
 */

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_RE   = /^\d{6}$/;
const SLUG_RE  = /^[a-z0-9_-]{2,30}$/;

export const validate = {
  uuid:     (v) => typeof v === 'string' && UUID_RE.test(v),
  email:    (v) => typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 254,
  otp:      (v) => typeof v === 'string' && OTP_RE.test(v),
  slug:     (v) => typeof v === 'string' && SLUG_RE.test(v),
  nonEmpty: (v) => typeof v === 'string' && v.trim().length > 0,
  maxLen:   (v, max) => typeof v === 'string' && v.length <= max,
  enum:     (v, allowed) => allowed.includes(v),
  bool:     (v) => typeof v === 'boolean',
  posInt:   (v) => Number.isInteger(v) && v > 0,
};

/**
 * Validates a plain object against a schema map.
 * Returns { ok, errors } where errors is { field: message }.
 *
 * @example
 * const { ok, errors } = validateBody(body, {
 *   email:  [validate.email,    'Invalid email'],
 *   userId: [validate.uuid,     'Invalid user ID'],
 *   plan:   [(v) => validate.enum(v, PLANS), 'Unknown plan'],
 * });
 * if (!ok) return Response.json({ errors }, { status: 400 });
 */
export function validateBody(body, schema) {
  const errors = {};
  for (const [field, [check, message]] of Object.entries(schema)) {
    if (!check(body?.[field])) errors[field] = message;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
