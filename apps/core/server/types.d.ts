import type { SafeUser, SessionRecord } from '@shared/types'

declare global {
  namespace Express {
    interface Request {
      user: SafeUser | null
      session: SessionRecord | null
      sessionId: string | undefined
      ctx: { ip: string; userAgent: string }
    }
  }
}

export {}
