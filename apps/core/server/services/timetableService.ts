import { timetableSlotsRepo, classesRepo, subjectsRepo, teachersRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, loadOrgs, actingOrgId,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import type { ClassRecord, Id, SafeUser, Subject, Teacher, TimetableSlot } from '@shared/types'

const DAYS = [1, 2, 3, 4, 5]

async function classInScope(actor: SafeUser, classId: Id): Promise<ClassRecord> {
  const cls = (await classesRepo.get(classId)) as ClassRecord | null
  if (!cls) throw new NotFoundError('Class')
  assertTenant(actor, cls, await loadOrgs())
  return cls
}

export const timetableService = {
  async forClass(actor: SafeUser, classId: Id): Promise<TimetableSlot[]> {
    assertPermission(actor, P.ATTENDANCE_VIEW)
    await classInScope(actor, classId)
    return ((await timetableSlotsRepo.list({ classId })) as TimetableSlot[])
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period)
  },

  async forTeacher(actor: SafeUser, teacherId: Id): Promise<TimetableSlot[]> {
    assertPermission(actor, P.ATTENDANCE_VIEW)
    const rows = scopeRows(actor, (await timetableSlotsRepo.list()) as TimetableSlot[], await loadOrgs())
    return rows.filter((s) => s.teacherId === teacherId).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period)
  },

  /** The subject scheduled for a class on a given weekday + period, if any. */
  async slotFor(organizationId: Id, classId: Id, dayOfWeek: number, period: number): Promise<TimetableSlot | null> {
    const rows = (await timetableSlotsRepo.list({ classId })) as TimetableSlot[]
    return rows.find((s) => s.organizationId === organizationId && s.dayOfWeek === dayOfWeek && s.period === period) ?? null
  },

  async create(
    actor: SafeUser,
    input: { classId: Id; dayOfWeek: number; period: number; startTime: string; endTime: string; subjectId?: Id | null; teacherId?: Id | null; room?: string },
  ): Promise<TimetableSlot> {
    assertPermission(actor, P.TIMETABLE_MANAGE)
    const organizationId = actingOrgId(actor)
    const cls = await classInScope(actor, input.classId)
    if (!DAYS.includes(input.dayOfWeek)) throw new ValidationError('dayOfWeek must be 1–5.')
    if (!(input.period >= 1)) throw new ValidationError('period must be 1 or more.')

    const clash = ((await timetableSlotsRepo.list({ classId: input.classId })) as TimetableSlot[])
      .find((s) => s.dayOfWeek === input.dayOfWeek && s.period === input.period)
    if (clash) throw new ValidationError('That day/period slot is already filled for this class.')

    let subjectName = ''
    if (input.subjectId) {
      const subj = (await subjectsRepo.get(input.subjectId)) as Subject | null
      if (!subj || subj.organizationId !== organizationId) throw new ValidationError('Unknown subject.')
      subjectName = subj.name
    }
    if (input.teacherId) {
      const t = (await teachersRepo.get(input.teacherId)) as Teacher | null
      if (!t || t.organizationId !== organizationId) throw new ValidationError('Unknown teacher.')
      const teacherClash = scopeRows(actor, (await timetableSlotsRepo.list()) as TimetableSlot[], await loadOrgs())
        .find((s) => s.teacherId === input.teacherId && s.dayOfWeek === input.dayOfWeek && s.period === input.period)
      if (teacherClash) throw new ValidationError('That teacher already has a class in this slot.')
    }

    const slot = (await timetableSlotsRepo.create({
      organizationId, classId: cls.id, dayOfWeek: input.dayOfWeek, period: input.period,
      startTime: input.startTime || '08:00', endTime: input.endTime || '08:50',
      subjectId: input.subjectId ?? null, subjectName, teacherId: input.teacherId ?? null, room: input.room ?? cls.room ?? '',
    }, actor.id)) as TimetableSlot
    await auditService.record({ actor, action: 'TIMETABLE_SLOT_CREATED', targetId: slot.id, targetType: 'timetableSlot', organizationId })
    return slot
  },

  async update(actor: SafeUser, id: Id, patch: Partial<TimetableSlot>): Promise<TimetableSlot> {
    assertPermission(actor, P.TIMETABLE_MANAGE)
    const slot = (await timetableSlotsRepo.get(id)) as TimetableSlot | null
    if (!slot) throw new NotFoundError('Timetable slot')
    assertTenant(actor, slot, await loadOrgs())
    const next: Partial<TimetableSlot> = {}
    for (const k of ['startTime', 'endTime', 'room', 'teacherId'] as const) {
      if (patch[k] !== undefined) (next as Record<string, unknown>)[k] = patch[k]
    }
    if (patch.subjectId !== undefined) {
      next.subjectId = patch.subjectId
      const subj = patch.subjectId ? ((await subjectsRepo.get(patch.subjectId)) as Subject | null) : null
      next.subjectName = subj?.name ?? ''
    }
    return timetableSlotsRepo.update(id, next, { actorId: actor.id }) as Promise<TimetableSlot>
  },

  async remove(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.TIMETABLE_MANAGE)
    const slot = (await timetableSlotsRepo.get(id)) as TimetableSlot | null
    if (!slot) throw new NotFoundError('Timetable slot')
    assertTenant(actor, slot, await loadOrgs())
    await timetableSlotsRepo.remove(id, actor.id)
    await auditService.record({ actor, action: 'TIMETABLE_SLOT_REMOVED', targetId: id, targetType: 'timetableSlot', organizationId: slot.organizationId })
  },
}
