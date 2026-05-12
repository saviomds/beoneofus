/**
 * In-memory rate limiter for Next.js API routes (Node.js runtime).
 *
 * State persists across requests while the serverless function is warm.
 * For multi-instance / Edge deployments swap the Map for Upstash Redis.
 *
 * Usage inside an API route handler:
 *
 *   import { checkRateLimit } from '@/lib/rateLimit';
 *
 *   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
 *   const rl = checkRateLimit(ip, '/api/chats', { max: 15, windowMs: 60_000 });
 *   if (rl.limited) {
 *     return NextResponse.json({ error: 'Too many requests' }, {
 *       status: 429,
 *       headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
 *     });
 *   }
 */

// Map<key, { count: number, resetAt: number }>
const store = new Map();

// Prune expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param {string} ip      — Caller IP address
 * @param {string} route   — Route identifier, e.g. '/api/chats'
 * @param {{ max?: number, windowMs?: number }} options
 * @returns {{ limited: boolean, remaining: number, resetAt?: number }}
 */
export function checkRateLimit(ip, route, options = {}) {
  const { max = 30, windowMs = 60_000 } = options;
  const key = `${ip}:${route}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { limited: false, remaining: max - entry.count };
}
