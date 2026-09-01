import { studentsRepo, classesRepo, enrollmentsRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, loadOrgs, actingOrgId,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { enrollmentService } from './enrollmentService'
import { gradesFor } from '@shared/config/educationStructures'
import type { ClassRecord, Enrollment, Id, SafeUser, Student } from '@shared/types'

interface PromotionRow {
  studentId: Id
  studentName: string
  currentGrade: string
  currentClassId: Id | null
  nextGrade: string | null
  action: 'promote' | 'graduate' | 'hold'
}

function nextGrade(grade: string): string | null {
  for (const key of ['PRIMARY', 'O_LEVEL', 'A_LEVEL', 'LOWER_SECONDARY', 'UPPER_SECONDARY', 'COLLEGE', 'UNIVERSITY'] as const) {
    const list = gradesFor([key])
    const i = list.indexOf(grade)
    if (i !== -1) return i + 1 < list.length ? list[i + 1] : null
  }
  return null
}

async function classInScope(actor: SafeUser, classId: Id): Promise<ClassRecord> {
  const cls = (await classesRepo.get(classId)) as ClassRecord | null
  if (!cls) throw new NotFoundError('Class')
  assertTenant(actor, cls, await loadOrgs())
  return cls
}

async function cohort(actor: SafeUser, input: { classId?: Id; gradeLevel?: string }): Promise<Student[]> {
  const orgId = actingOrgId(actor)
  let rows = scopeRows(actor, (await studentsRepo.list()) as Student[], await loadOrgs())
    .filter((s) => s.organizationId === orgId && s.status === 'active')
  if (input.classId) {
    const cls = await classInScope(actor, input.classId)
    rows = rows.filter((s) => cls.studentIds.includes(s.id))
  } else if (input.gradeLevel) {
    rows = rows.filter((s) => s.gradeLevel === input.gradeLevel)
  }
  return rows
}

export const batchService = {
  async previewPromotion(actor: SafeUser, input: { classId?: Id; gradeLevel?: string }): Promise<PromotionRow[]> {
    assertPermission(actor, P.BATCH_OPERATIONS)
    const students = await cohort(actor, input)
    if (!students.length) throw new ValidationError('No active students match that class or grade.')
    return students.map((s) => {
      const ng = nextGrade(s.gradeLevel)
      return {
        studentId: s.id, studentName: `${s.firstName} ${s.lastName}`, currentGrade: s.gradeLevel,
        currentClassId: s.classId, nextGrade: ng, action: ng ? 'promote' : 'graduate',
      }
    })
  },

  async commitPromotion(
    actor: SafeUser,
    input: { classId?: Id; gradeLevel?: string; toAcademicYear: string; overrides?: Record<Id, 'promote' | 'graduate' | 'hold'> },
  ): Promise<{ promoted: number; graduated: number; held: number }> {
    assertPermission(actor, P.BATCH_OPERATIONS)
    assertPermission(actor, P.ENROLLMENT_MANAGE)
    if (!input.toAcademicYear) throw new ValidationError('Set the new academic year.')
    const rows = await this.previewPromotion(actor, input)
    let promoted = 0
    let graduated = 0
    let held = 0
    for (const r of rows) {
      const decision = input.overrides?.[r.studentId] ?? r.action
      if (decision === 'hold') { held += 1; continue }
      if (decision === 'graduate' || !r.nextGrade) {
        await enrollmentService.graduate(actor, r.studentId)
        graduated += 1
      } else {
        await enrollmentService.promote(actor, r.studentId, r.nextGrade, input.toAcademicYear)
        promoted += 1
      }
    }
    await auditService.record({
      actor, action: 'BATCH_PROMOTION', targetType: 'student', organizationId: actor.organizationId,
      metadata: { toAcademicYear: input.toAcademicYear, promoted, graduated, held },
    })
    return { promoted, graduated, held }
  },

  async previewGraduation(actor: SafeUser, input: { classId?: Id; gradeLevel?: string }): Promise<{ studentId: Id; studentName: string; grade: string }[]> {
    assertPermission(actor, P.BATCH_OPERATIONS)
    const students = await cohort(actor, input)
    return students.map((s) => ({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}`, grade: s.gradeLevel }))
  },

  async commitGraduation(actor: SafeUser, input: { classId?: Id; gradeLevel?: string }): Promise<{ graduated: number }> {
    assertPermission(actor, P.BATCH_OPERATIONS)
    assertPermission(actor, P.ENROLLMENT_MANAGE)
    const students = await cohort(actor, input)
    for (const s of students) await enrollmentService.graduate(actor, s.id)
    await auditService.record({ actor, action: 'BATCH_GRADUATION', targetType: 'student', organizationId: actor.organizationId, metadata: { graduated: students.length } })
    return { graduated: students.length }
  },

  /** Close the year: archive a class and mark its active enrolments completed. */
  async archiveClass(actor: SafeUser, classId: Id): Promise<{ enrolmentsClosed: number }> {
    assertPermission(actor, P.BATCH_OPERATIONS)
    const cls = await classInScope(actor, classId)
    const active = ((await enrollmentsRepo.list()) as Enrollment[]).filter((e) => e.classId === classId && e.status === 'ACTIVE')
    for (const e of active) {
      await enrollmentsRepo.update(e.id, { status: 'COMPLETED', endDate: new Date().toISOString().slice(0, 10), note: 'Academic year closed' }, { actorId: actor.id })
    }
    await classesRepo.update(classId, { status: 'archived' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'CLASS_ARCHIVED', targetId: classId, targetType: 'class', organizationId: cls.organizationId, metadata: { enrolmentsClosed: active.length } })
    return { enrolmentsClosed: active.length }
  },
}
