import type { RequestHandler } from 'express'
import { RateLimitError } from './errors'

interface Bucket {
  count: number
  resetAt: number
}

/** In-memory fixed-window rate limiter. Good enough for a single Node process. */
export function rateLimit(opts: { windowMs: number; max: number; key?: (ip: string, path: string) => string }): RequestHandler {
  const buckets = new Map<string, Bucket>()
  return (req, _res, next) => {
    const ip = req.ctx?.ip ?? req.ip ?? 'unknown'
    const key = opts.key ? opts.key(ip, req.path) : `${ip}:${req.path}`
    const now = Date.now()
    let b = buckets.get(key)
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + opts.windowMs }
      buckets.set(key, b)
    }
    b.count += 1
    if (b.count > opts.max) {
      next(new RateLimitError())
      return
    }
    next()
  }
}
