import { interventionsRepo, studentsRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, notificationService, loadOrgs, recent,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import type { Id, Intervention, InterventionKind, InterventionNote, InterventionStatus, SafeUser, Student } from '@shared/types'

function note(actorId: Id, text: string): InterventionNote {
  return { id: `inn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), actorId, note: text }
}

export const interventionService = {
  async list(actor: SafeUser, q: { studentId?: Id; status?: InterventionStatus; kind?: InterventionKind } = {}): Promise<Intervention[]> {
    assertPermission(actor, P.INTERVENTION_MANAGE)
    let rows = scopeRows(actor, (await interventionsRepo.list()) as Intervention[], await loadOrgs())
    if (q.studentId) rows = rows.filter((r) => r.studentId === q.studentId)
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.kind) rows = rows.filter((r) => r.kind === q.kind)
    return recent(rows)
  },

  async get(actor: SafeUser, id: Id): Promise<Intervention> {
    assertPermission(actor, P.INTERVENTION_MANAGE)
    const i = (await interventionsRepo.get(id)) as Intervention | null
    if (!i) throw new NotFoundError('Intervention')
    assertTenant(actor, i, await loadOrgs())
    return i
  },

  async open(
    actor: SafeUser,
    input: { studentId: Id; kind: InterventionKind; reason: string; assignedTo?: Id | null },
  ): Promise<Intervention> {
    assertPermission(actor, P.INTERVENTION_MANAGE)
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    assertTenant(actor, student, await loadOrgs())
    if (!input.reason?.trim()) throw new ValidationError('State the reason for the intervention.')

    const id = await reference(interventionsRepo as never, 'INT')
    const intervention = (await interventionsRepo.create({
      id, reference: id, studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      kind: input.kind, reason: input.reason.trim(), status: 'open', openedBy: actor.id,
      assignedTo: input.assignedTo ?? null, notes: [], metric: null, threshold: null, autoOpened: false,
      organizationId: student.organizationId,
    }, actor.id)) as Intervention
    await auditService.record({ actor, action: 'INTERVENTION_OPENED', targetId: id, targetType: 'intervention', organizationId: student.organizationId, metadata: { studentId: student.id, kind: input.kind } })
    if (input.assignedTo) {
      await notificationService.create({ recipientId: input.assignedTo, type: 'system', title: 'Intervention assigned', message: `${intervention.studentName}: ${input.reason.slice(0, 80)}`, actionUrl: '/school/interventions', organizationId: student.organizationId })
    }
    return intervention
  },

  async advance(
    actor: SafeUser,
    id: Id,
    patch: { status?: InterventionStatus; assignedTo?: Id | null; note?: string },
  ): Promise<Intervention> {
    const intervention = await this.get(actor, id)
    const next: Partial<Intervention> = {}
    if (patch.note?.trim()) next.notes = [...intervention.notes, note(actor.id, patch.note.trim())]
    if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo
    if (patch.status && patch.status !== intervention.status) next.status = patch.status
    if (!Object.keys(next).length) return intervention

    const updated = (await interventionsRepo.update(id, next, { actorId: actor.id })) as Intervention
    await auditService.record({ actor, action: 'INTERVENTION_UPDATED', targetId: id, targetType: 'intervention', organizationId: intervention.organizationId, metadata: { status: updated.status } })
    if (next.assignedTo) {
      await notificationService.create({ recipientId: next.assignedTo, type: 'system', title: 'Intervention assigned to you', message: intervention.studentName, actionUrl: '/school/interventions', organizationId: intervention.organizationId })
    }
    return updated
  },
}
