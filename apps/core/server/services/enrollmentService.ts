import { enrollmentsRepo, studentsRepo, classesRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, auditService, loadOrgs } from './_shared'
import { NotFoundError, TenantError } from '../lib/errors'
import { enrollmentRef } from '../lib/codes'
import { assertRecordAccess } from '../lib/records'
import type { EducationStructureKey, Enrollment, Id, SafeUser, Student } from '@shared/types'

async function requireStudent(actor: SafeUser, id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  assertTenant(actor, s, await loadOrgs())
  return s
}

export const enrollmentService = {
  /** Full enrollment history — tenant-checked, or via grant / guardian link. */
  async history(actor: SafeUser, studentId: Id): Promise<Enrollment[]> {
    const s = (await studentsRepo.get(studentId)) as Student | null
    if (!s) throw new NotFoundError('Student')
    let scopeOrgId: string | undefined
    try {
      assertTenant(actor, s, await loadOrgs())
    } catch (err) {
      if (err instanceof TenantError) {
        const access = await assertRecordAccess(actor, s, 'ENROLLMENTS')
        scopeOrgId = access.scopeOrgId
      } else throw err
    }
    let rows = (await enrollmentsRepo.list({ studentId })) as Enrollment[]
    if (scopeOrgId) rows = rows.filter((e) => e.organizationId === scopeOrgId)
    return rows.sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
  },

  async active(actor: SafeUser, studentId: Id): Promise<Enrollment | null> {
    return (await this.history(actor, studentId)).find((e) => e.status === 'ACTIVE') ?? null
  },

  async enroll(
    actor: SafeUser,
    input: { studentId: Id; academicYear: string; level: EducationStructureKey; gradeLevel: string; classId?: Id | null; studyCode?: string; note?: string },
  ): Promise<Enrollment> {
    assertPermission(actor, P.ENROLLMENT_MANAGE)
    const student = await requireStudent(actor, input.studentId)
    // close any current active enrollment
    for (const e of await this.history(actor, input.studentId)) {
      if (e.status === 'ACTIVE') {
        await enrollmentsRepo.update(e.id, { status: 'COMPLETED', endDate: new Date().toISOString().slice(0, 10) }, { actorId: actor.id })
      }
    }
    const seq = ((await enrollmentsRepo.list()) as Enrollment[]).length + 1
    const enrollment = (await enrollmentsRepo.create({
      id: enrollmentRef(seq), studentId: input.studentId, organizationId: student.organizationId,
      academicYear: input.academicYear, level: input.level, gradeLevel: input.gradeLevel,
      classId: input.classId ?? null, studyCode: input.studyCode ?? '', status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10), endDate: null, note: input.note ?? '',
    }, actor.id)) as Enrollment
    await studentsRepo.update(input.studentId, { gradeLevel: input.gradeLevel, classId: input.classId ?? null, studyCode: input.studyCode ?? student.studyCode }, { actorId: actor.id })
    await auditService.record({ actor, action: 'ENROLLMENT_CREATED', targetId: enrollment.id, targetType: 'enrollment', organizationId: student.organizationId })
    return enrollment
  },

  async promote(actor: SafeUser, studentId: Id, toGrade: string, academicYear: string): Promise<Enrollment> {
    const active = await this.active(actor, studentId)
    if (!active) throw new NotFoundError('Active enrollment')
    return this.enroll(actor, { studentId, academicYear, level: active.level, gradeLevel: toGrade, studyCode: active.studyCode, note: `Promoted from ${active.gradeLevel}` })
  },

  async graduate(actor: SafeUser, studentId: Id): Promise<void> {
    assertPermission(actor, P.ENROLLMENT_MANAGE)
    const student = await requireStudent(actor, studentId)
    const active = await this.active(actor, studentId)
    if (active) await enrollmentsRepo.update(active.id, { status: 'GRADUATED', endDate: new Date().toISOString().slice(0, 10) }, { actorId: actor.id })
    await studentsRepo.update(studentId, { status: 'inactive' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'STUDENT_GRADUATED', targetId: studentId, targetType: 'student', organizationId: student.organizationId })
  },

  async withdraw(actor: SafeUser, studentId: Id, reason: string): Promise<void> {
    assertPermission(actor, P.ENROLLMENT_MANAGE)
    const student = await requireStudent(actor, studentId)
    const active = await this.active(actor, studentId)
    if (active) await enrollmentsRepo.update(active.id, { status: 'WITHDRAWN', endDate: new Date().toISOString().slice(0, 10), note: reason }, { actorId: actor.id })
    await studentsRepo.update(studentId, { status: 'inactive' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'STUDENT_WITHDRAWN', targetId: studentId, targetType: 'student', organizationId: student.organizationId, metadata: { reason } })
  },

  async classOptions(actor: SafeUser): Promise<{ id: Id; name: string }[]> {
    const rows = (await classesRepo.list()) as { id: Id; name: string; organizationId: string }[]
    return rows.filter((c) => actor.role === 'admin' || c.organizationId === actor.organizationId).map((c) => ({ id: c.id, name: c.name }))
  },
}
