import { auditRepo } from '../lib/db'
import type { AuditLog, Id, Role, SafeUser } from '@shared/types'

export interface AuditInput {
  actor: Pick<SafeUser, 'id' | 'role' | 'organizationId'> | { id: Id; role: Role | 'system'; organizationId?: Id | null } | null
  action: string
  targetId?: Id | null
  targetType?: string | null
  organizationId?: Id | null
  result?: AuditLog['result']
  ip?: string
  metadata?: Record<string, unknown>
}

export const auditService = {
  async record(input: AuditInput): Promise<AuditLog> {
    return auditRepo.create({
      actorId: input.actor?.id ?? 'system',
      actorRole: (input.actor?.role as Role | 'system') ?? 'system',
      organizationId: input.organizationId ?? input.actor?.organizationId ?? null,
      action: input.action,
      targetId: input.targetId ?? null,
      targetType: input.targetType ?? null,
      timestamp: new Date().toISOString(),
      ip: input.ip ?? 'local',
      result: input.result ?? 'SUCCESS',
      metadata: input.metadata ?? {},
    }) as Promise<AuditLog>
  },

  async list(filter?: { organizationId?: Id; actorId?: Id; action?: string }): Promise<AuditLog[]> {
    let rows = (await auditRepo.list()) as AuditLog[]
    if (filter?.organizationId) rows = rows.filter((r) => r.organizationId === filter.organizationId)
    if (filter?.actorId) rows = rows.filter((r) => r.actorId === filter.actorId)
    if (filter?.action) rows = rows.filter((r) => r.action === filter.action)
    return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  },
}
