import {
  studentsRepo, teachersRepo, mentorsRepo, attendanceRepo, academicRepo, reportsRepo,
  classesRepo, auditRepo, organizationsRepo, usersRepo,
} from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, loadOrgs } from './_shared'
import { TenantError } from '../lib/errors'
import type {
  AcademicRecord, AttendanceRecord, AuditLog, Id, Organization, Report, SafeUser, Student,
} from '@shared/types'

interface Trend { label: string; value: number }

const rate = (recs: AttendanceRecord[]) =>
  recs.length ? Math.round((recs.filter((r) => r.status === 'present' || r.status === 'late').length / recs.length) * 100) : 0

export const analyticsService = {
  /** Institution dashboard — data for ONE organization only. */
  async institution(actor: SafeUser, organizationId: Id) {
    assertPermission(actor, P.ANALYTICS_SCHOOL)
    if (actor.role !== 'admin' && actor.organizationId !== organizationId) throw new TenantError()

    const students = ((await studentsRepo.list({ organizationId })) as Student[]).filter((s) => s.status !== 'archived')
    const attendance = (await attendanceRepo.list({ organizationId })) as AttendanceRecord[]
    const academic = (await academicRepo.list({ organizationId })) as AcademicRecord[]
    const classes = (await classesRepo.list({ organizationId })) as { id: Id; name: string; studentIds: Id[] }[]
    const reports = (await reportsRepo.list({ organizationId })) as Report[]
    const teachers = ((await teachersRepo.list({ organizationId })) as unknown[]).length
    const mentors = ((await mentorsRepo.list()) as { organizationId: Id | null }[]).filter((m) => m.organizationId === organizationId).length

    const perStudentAvg = new Map<Id, number>()
    for (const s of students) {
      const recs = academic.filter((r) => r.studentId === s.id)
      if (recs.length) perStudentAvg.set(s.id, recs.reduce((x, r) => x + r.score, 0) / recs.length)
    }
    const perStudentAtt = new Map<Id, AttendanceRecord[]>()
    for (const a of attendance) {
      const arr = perStudentAtt.get(a.studentId) ?? []
      arr.push(a)
      perStudentAtt.set(a.studentId, arr)
    }
    const atRisk = students.filter((s) => rate(perStudentAtt.get(s.id) ?? []) < 75 || (perStudentAvg.get(s.id) ?? 100) < 60).length
    const improving = students.filter((s) => (perStudentAvg.get(s.id) ?? 0) >= 75).length

    const byDate = new Map<string, AttendanceRecord[]>()
    for (const a of attendance) {
      const arr = byDate.get(a.date) ?? []
      arr.push(a)
      byDate.set(a.date, arr)
    }
    const attendanceTrend: Trend[] = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-6).map(([d, recs]) => ({ label: d.slice(5), value: rate(recs) }))

    return {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === 'active').length,
      attendanceRate: rate(attendance),
      academicAverage: academic.length ? Math.round(academic.reduce((x, r) => x + r.score, 0) / academic.length) : 0,
      atRisk, improving, teachers, mentors,
      reportsPending: reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length,
      reportCompletion: reports.length ? Math.round((reports.filter((r) => r.status === 'approved').length / reports.length) * 100) : 0,
      performanceByClass: classes.map((c) => {
        const recs = academic.filter((r) => c.studentIds.includes(r.studentId))
        return { className: c.name, students: c.studentIds.length, average: recs.length ? Math.round(recs.reduce((x, r) => x + r.score, 0) / recs.length) : 0 }
      }),
      attendanceTrend,
    }
  },

  async studentProgress(actor: SafeUser, studentId: Id) {
    const student = (await studentsRepo.get(studentId)) as Student | null
    if (!student) throw new TenantError()
    if (actor.role === 'student' && student.userId !== actor.id) throw new TenantError()
    if (actor.role !== 'student') assertTenant(actor, student, await loadOrgs())
    const academic = (await academicRepo.list({ studentId })) as AcademicRecord[]
    const attendance = (await attendanceRepo.list({ studentId })) as AttendanceRecord[]
    return {
      average: academic.length ? Math.round(academic.reduce((x, r) => x + r.score, 0) / academic.length) : 0,
      attendanceRate: rate(attendance),
      bySubject: academic.map((r) => ({ label: r.subjectName, value: r.score })),
      skills: student.skills,
    }
  },

  /** Government view — AGGREGATED per school + per district. Never raw student rows. */
  async government(actor: SafeUser) {
    assertPermission(actor, P.ANALYTICS_GOVERNMENT)
    const orgs = ((await organizationsRepo.list()) as Organization[]).filter((o) => o.organizationType !== 'GOVERNMENT_INSTITUTION')
    const g = actor.govScope
    const inJurisdiction = (o: Organization) =>
      actor.role === 'admin' || !g || g.level === 'NATIONAL' ||
      (g.level === 'REGIONAL' ? (g.provinces ?? []).includes(o.province) : (g.districts ?? []).includes(o.district))
    const visible = orgs.filter(inJurisdiction)

    const perSchool = await Promise.all(visible.map(async (o) => {
      const students = ((await studentsRepo.list({ organizationId: o.id })) as Student[]).filter((s) => s.status !== 'archived')
      const att = (await attendanceRepo.list({ organizationId: o.id })) as AttendanceRecord[]
      const acr = (await academicRepo.list({ organizationId: o.id })) as AcademicRecord[]
      const teachers = ((await teachersRepo.list({ organizationId: o.id })) as unknown[]).length
      return {
        organizationId: o.id, name: o.officialName, district: o.district, province: o.province,
        type: o.organizationType, status: o.status,
        students: students.length, teachers,
        attendanceRate: rate(att),
        academicAverage: acr.length ? Math.round(acr.reduce((x, r) => x + r.score, 0) / acr.length) : 0,
      }
    }))

    const totalStudents = perSchool.reduce((s, r) => s + r.students, 0)
    const byDistrict = new Map<string, { schools: number; students: number; attSum: number }>()
    for (const s of perSchool) {
      const cur = byDistrict.get(s.district) ?? { schools: 0, students: 0, attSum: 0 }
      cur.schools += 1
      cur.students += s.students
      cur.attSum += s.attendanceRate * s.students
      byDistrict.set(s.district, cur)
    }
    return {
      overview: {
        institutions: visible.length,
        activeInstitutions: visible.filter((o) => o.status === 'ACTIVE').length,
        students: totalStudents,
        teachers: perSchool.reduce((s, r) => s + r.teachers, 0),
        mentors: ((await mentorsRepo.list()) as unknown[]).length,
        attendanceRate: totalStudents ? Math.round(perSchool.reduce((s, r) => s + r.attendanceRate * r.students, 0) / totalStudents) : 0,
        academicAverage: totalStudents ? Math.round(perSchool.reduce((s, r) => s + r.academicAverage * r.students, 0) / totalStudents) : 0,
        districts: byDistrict.size,
      },
      perSchool,
      byDistrict: [...byDistrict.entries()].map(([district, v]) => ({
        district, schools: v.schools, students: v.students,
        attendanceRate: v.students ? Math.round(v.attSum / v.students) : 0,
      })),
    }
  },

  async platform(actor: SafeUser) {
    assertPermission(actor, P.ANALYTICS_PLATFORM)
    const logs = (await auditRepo.list()) as AuditLog[]
    const byDay = new Map<string, number>()
    const byAction = new Map<string, number>()
    for (const l of logs) {
      const d = l.timestamp.slice(0, 10)
      byDay.set(d, (byDay.get(d) ?? 0) + 1)
      byAction.set(l.action, (byAction.get(l.action) ?? 0) + 1)
    }
    return {
      activityByDay: [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-7).map(([d, v]) => ({ label: d.slice(5), value: v })),
      topActions: [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([action, count]) => ({ action, count })),
      totals: {
        organizations: ((await organizationsRepo.list()) as unknown[]).length,
        users: ((await usersRepo.list()) as unknown[]).length,
        students: ((await studentsRepo.list()) as unknown[]).length,
        events: logs.length,
      },
    }
  },
}
