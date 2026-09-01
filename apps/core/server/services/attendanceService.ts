import {
  attendanceRepo, studentsRepo, interventionsRepo, settingsRepo, usersRepo, guardianLinksRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, auditService, notificationService, loadOrgs,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import { assertRecordAccess } from '../lib/records'
import type {
  AttendanceRecord, GuardianLink, Id, Intervention, SafeUser, SettingsRecord, Student, User,
} from '@shared/types'

const DEFAULT_THRESHOLD = 75 // minimum acceptable attendance %

async function requireStudent(id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  return s
}

async function orgThreshold(organizationId: Id): Promise<number> {
  const s = ((await settingsRepo.list()) as SettingsRecord[]).find((r) => r.id === organizationId && r.scope === 'school')
  const v = s?.values?.attendanceThreshold
  return typeof v === 'number' && v > 0 && v <= 100 ? v : DEFAULT_THRESHOLD
}

async function notifyGuardians(studentId: Id, title: string, message: string) {
  const links = ((await guardianLinksRepo.list({ studentId })) as GuardianLink[]).filter((l) => l.status === 'active')
  for (const l of links) {
    await notificationService.create({ recipientId: l.guardianUserId, type: 'attendance', title, message, actionUrl: '/guardian/children' })
  }
}

export const attendanceService = {
  /** Student or a linked guardian asks for an absence to be excused. */
  async requestExcuse(actor: SafeUser, attendanceId: Id, reason: string): Promise<AttendanceRecord> {
    const rec = (await attendanceRepo.get(attendanceId)) as AttendanceRecord | null
    if (!rec) throw new NotFoundError('Attendance record')
    const student = await requireStudent(rec.studentId)

    if (actor.role === 'student') {
      if (student.userId !== actor.id) throw new NotFoundError('Attendance record')
    } else if (actor.role === 'guardian') {
      await assertRecordAccess(actor, student, 'ATTENDANCE_SUMMARY')
    } else {
      assertPermission(actor, P.ATTENDANCE_EXCUSE)
      assertTenant(actor, rec, await loadOrgs())
    }
    if (!reason?.trim()) throw new ValidationError('Give a reason for the excuse request.')
    if (rec.status !== 'absent' && rec.status !== 'late' && rec.status !== 'left_early') {
      throw new ValidationError('Only an absence or lateness can be excused.')
    }

    const updated = (await attendanceRepo.update(attendanceId, { excuseStatus: 'requested', excuseReason: reason.trim() }, { actorId: actor.id })) as AttendanceRecord
    await auditService.record({ actor, action: 'EXCUSE_REQUESTED', targetId: attendanceId, targetType: 'attendance', organizationId: rec.organizationId, metadata: { studentId: rec.studentId } })
    const staff = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === rec.organizationId && (u.role === 'school' || u.id === rec.recordedBy))
    for (const u of staff) {
      await notificationService.create({ recipientId: u.id, type: 'attendance', title: 'Absence excuse requested', message: `${student.firstName} ${student.lastName} — ${rec.date}: ${reason.trim().slice(0, 80)}`, actionUrl: '/school/attendance', organizationId: rec.organizationId })
    }
    return updated
  },

  /** Teacher / school approves or rejects an excuse request. */
  async reviewExcuse(actor: SafeUser, attendanceId: Id, decision: 'approve' | 'reject', note = ''): Promise<AttendanceRecord> {
    assertPermission(actor, P.ATTENDANCE_EXCUSE)
    const rec = (await attendanceRepo.get(attendanceId)) as AttendanceRecord | null
    if (!rec) throw new NotFoundError('Attendance record')
    assertTenant(actor, rec, await loadOrgs())
    if (rec.excuseStatus !== 'requested') throw new ValidationError('There is no pending excuse request on this record.')

    const patch: Partial<AttendanceRecord> = {
      excuseStatus: decision === 'approve' ? 'approved' : 'rejected',
      excusedBy: actor.id, excusedAt: new Date().toISOString(),
      excuseReason: note ? `${rec.excuseReason} — ${note}` : rec.excuseReason,
    }
    if (decision === 'approve') patch.status = 'excused'
    const updated = (await attendanceRepo.update(attendanceId, patch, { actorId: actor.id })) as AttendanceRecord

    await auditService.record({ actor, action: decision === 'approve' ? 'EXCUSE_APPROVED' : 'EXCUSE_REJECTED', targetId: attendanceId, targetType: 'attendance', organizationId: rec.organizationId, metadata: { studentId: rec.studentId } })
    const student = await requireStudent(rec.studentId)
    await notificationService.create({ recipientId: student.userId, type: 'attendance', title: `Excuse ${decision === 'approve' ? 'approved' : 'rejected'}`, message: `${rec.date}: your absence excuse was ${decision === 'approve' ? 'approved' : 'not approved'}.`, actionUrl: '/student/attendance', organizationId: rec.organizationId })
    await notifyGuardians(rec.studentId, `Excuse ${decision === 'approve' ? 'approved' : 'rejected'}`, `${student.firstName} — ${rec.date}`)
    if (decision === 'approve') await evaluateAttendanceThreshold(actor, rec.studentId)
    return updated
  },

  async pendingExcuses(actor: SafeUser): Promise<(AttendanceRecord & { studentName: string })[]> {
    assertPermission(actor, P.ATTENDANCE_EXCUSE)
    const orgs = await loadOrgs()
    const rows = ((await attendanceRepo.list()) as AttendanceRecord[]).filter((r) => r.excuseStatus === 'requested')
    const scoped = rows.filter((r) => {
      try { assertTenant(actor, r, orgs); return true } catch { return false }
    })
    return Promise.all(scoped.map(async (r) => {
      const s = (await studentsRepo.get(r.studentId)) as Student | null
      return { ...r, studentName: s ? `${s.firstName} ${s.lastName}` : r.studentId }
    }))
  },
}

/**
 * Recompute a student's attendance rate; if it has fallen below the institution's
 * configured threshold, open an auto-intervention (once) and alert staff + guardians.
 */
export async function evaluateAttendanceThreshold(actor: SafeUser, studentId: Id): Promise<void> {
  const student = (await studentsRepo.get(studentId)) as Student | null
  if (!student) return
  const rows = (await attendanceRepo.list({ studentId })) as AttendanceRecord[]
  if (rows.length < 5) return
  const counted = rows.length
  const attended = rows.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length
  const rate = Math.round((attended / counted) * 100)
  const threshold = await orgThreshold(student.organizationId)
  if (rate >= threshold) return

  const open = ((await interventionsRepo.list({ studentId })) as Intervention[]).some(
    (i) => i.kind === 'attendance' && (i.status === 'open' || i.status === 'in_progress'),
  )
  if (open) return

  const id = await reference(interventionsRepo as never, 'INT')
  const intervention = (await interventionsRepo.create({
    id, reference: id, studentId, studentName: `${student.firstName} ${student.lastName}`,
    kind: 'attendance', reason: `Attendance ${rate}% is below the ${threshold}% threshold.`,
    status: 'open', openedBy: actor.id, assignedTo: null, notes: [], metric: rate, threshold, autoOpened: true,
    organizationId: student.organizationId,
  }, actor.id)) as Intervention

  await auditService.record({ actor: { id: 'system', role: 'system' }, action: 'INTERVENTION_AUTO_OPENED', targetId: intervention.id, targetType: 'intervention', organizationId: student.organizationId, metadata: { studentId, rate, threshold } })
  const staff = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === student.organizationId && u.role === 'school')
  for (const u of staff) {
    await notificationService.create({ recipientId: u.id, type: 'attendance', title: 'Attendance intervention opened', message: `${student.firstName} ${student.lastName}: attendance ${rate}% (threshold ${threshold}%).`, actionUrl: '/school/interventions', organizationId: student.organizationId })
  }
  await notifyGuardians(studentId, 'Attendance concern', `${student.firstName}'s attendance has dropped to ${rate}%.`)
}
