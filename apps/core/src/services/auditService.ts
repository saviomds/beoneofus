import { api } from '@/lib/api'
import type { AuditLog } from '@shared/types'

export const auditService = {
  list: (filter?: { organizationId?: string; actorId?: string; action?: string }) =>
    api.get<AuditLog[]>('/audit', filter as Record<string, unknown>),
  // Audit records are written server-side as part of each mutation.
  record: async (_input: unknown) => {},
}
