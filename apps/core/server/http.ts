import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { toHttp } from './lib/errors'

/** Wrap an async handler that returns the payload for `{ data: ... }`. */
export function h(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res)
      .then((data) => {
        if (res.headersSent) return
        res.json({ data })
      })
      .catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const { status, code, message, details } = toHttp(err)
  if (status >= 500) console.error('[api]', err)
  res.status(status).json({ error: { code, message, details } })
}

/** Require the authenticated user; throws 401 handled by errorHandler. */
export function num(v: unknown, d?: number): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
