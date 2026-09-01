import { attendanceRepo, academicRepo, classesRepo, studentsRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, auditService, notificationService, loadOrgs,
} from './_shared'
import { NotFoundError } from '../lib/errors'
import { evaluateAttendanceThreshold } from './attendanceService'
import { timetableService } from './timetableService'
import type { AcademicRecord, AttendanceRecord, AttendanceStatus, ClassRecord, Id, SafeUser, Student } from '@shared/types'

export function gradeLetter(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export const teacherService = {
  async roster(actor: SafeUser, classId: Id): Promise<Student[]> {
    assertPermission(actor, P.ATTENDANCE_VIEW)
    const cls = (await classesRepo.get(classId)) as ClassRecord | null
    if (!cls) return []
    assertTenant(actor, cls, await loadOrgs())
    const all = (await studentsRepo.list()) as Student[]
    return all.filter((s) => cls.studentIds.includes(s.id))
  },

  async attendanceForDate(actor: SafeUser, classId: Id, date: string): Promise<AttendanceRecord[]> {
    assertPermission(actor, P.ATTENDANCE_VIEW)
    const cls = (await classesRepo.get(classId)) as ClassRecord | null
    if (cls) assertTenant(actor, cls, await loadOrgs())
    return ((await attendanceRepo.list({ classId })) as AttendanceRecord[]).filter((r) => r.date === date)
  },

  async recordAttendance(
    actor: SafeUser, classId: Id, date: string,
    entries: { studentId: Id; status: AttendanceStatus; note?: string }[],
    opts: { period?: number; subjectId?: Id | null } = {},
  ): Promise<void> {
    assertPermission(actor, P.ATTENDANCE_RECORD)
    const cls = (await classesRepo.get(classId)) as ClassRecord | null
    if (!cls) throw new NotFoundError('Class')
    assertTenant(actor, cls, await loadOrgs())
    const period = Number.isFinite(opts.period) ? Number(opts.period) : 0
    let subjectId = opts.subjectId ?? null
    if (period > 0 && !subjectId) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7
      const slot = await timetableService.slotFor(cls.organizationId, classId, weekday, period)
      subjectId = slot?.subjectId ?? null
    }
    const existing = (await attendanceRepo.list({ classId })) as AttendanceRecord[]
    for (const e of entries) {
      const prior = existing.find((r) => r.studentId === e.studentId && r.date === date && r.period === period && (r.subjectId ?? null) === subjectId)
      if (prior) {
        await attendanceRepo.update(prior.id, { status: e.status, recordedBy: actor.id, note: e.note ?? prior.note }, { actorId: actor.id })
      } else {
        await attendanceRepo.create({
          studentId: e.studentId, organizationId: cls.organizationId, schoolId: cls.organizationId,
          classId, period, subjectId, date, status: e.status, recordedBy: actor.id, note: e.note ?? '',
          excuseStatus: 'none', excuseReason: '', excuseDocumentId: null, excusedBy: null, excusedAt: null,
        }, actor.id)
      }
    }
    await auditService.record({ actor, action: 'ATTENDANCE_RECORDED', targetId: classId, targetType: 'class', organizationId: cls.organizationId, metadata: { date, period, count: entries.length } })
    for (const e of entries) {
      if (e.status === 'absent') await evaluateAttendanceThreshold(actor, e.studentId)
    }
  },

  async addGrade(
    actor: SafeUser,
    input: { studentId: Id; subjectId: Id; subjectName: string; term: string; score: number; teacherComment?: string },
  ): Promise<AcademicRecord> {
    assertPermission(actor, P.ACADEMIC_RECORD)
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    assertTenant(actor, student, await loadOrgs())
    const grade = gradeLetter(input.score)
    const record = (await academicRepo.create({
      studentId: input.studentId, organizationId: student.organizationId, schoolId: student.organizationId,
      subjectId: input.subjectId, subjectName: input.subjectName, term: input.term, score: input.score,
      grade, teacherId: actor.id, teacherComment: input.teacherComment ?? '',
    }, actor.id)) as AcademicRecord
    await auditService.record({ actor, action: 'GRADE_ADDED', targetId: record.id, targetType: 'academic', organizationId: student.organizationId, metadata: { studentId: input.studentId, score: input.score } })
    await notificationService.create({ recipientId: student.userId, type: 'academic', title: 'New grade posted', message: `${input.subjectName}: ${input.score}% (${grade})`, actionUrl: '/student/academic', organizationId: student.organizationId })
    return record
  },
}
