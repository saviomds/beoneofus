import {
  studentsRepo, usersRepo, academicRepo, attendanceRepo, reportsRepo, credentialsRepo,
  sessionsRepo, classesRepo, mentorsRepo, enrollmentsRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows,
  auditService, notificationService, loadOrgs, actingOrgId, paginate, recent,
} from './_shared'
import { NotFoundError, TenantError, ValidationError } from '../lib/errors'
import { AuthorizationError } from '@shared/rbac'
import { studentCode, enrollmentRef } from '../lib/codes'
import { hashPassword } from '../lib/password'
import { assertRecordAccess } from '../lib/records'
import type { RecordAccess } from '../lib/records'
import { toSafeUser } from './authService'
import type {
  AcademicRecord, AttendanceRecord, Credential, EducationStructureKey, Enrollment, Id,
  MentorshipSession, Permission, RecordType, Report, SafeUser, Student, User,
} from '@shared/types'

async function requireStudent(id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  return s
}

/**
 * A student may only ever read their own records. Everyone else needs the
 * permission AND either (a) the student in their own tenant / gov scope, or
 * (b) an active inter-institution RecordShareGrant for this record type.
 */
async function gate(
  actor: SafeUser,
  student: Student,
  viewPerm: Permission = P.STUDENTS_VIEW,
  recordType: RecordType = 'IDENTITY',
): Promise<RecordAccess> {
  if (actor.role === 'student') {
    if (student.userId !== actor.id) throw new AuthorizationError('students.view.own')
    return { mode: 'own' }
  }
  if (actor.role !== 'guardian') assertPermission(actor, viewPerm)
  try {
    assertTenant(actor, student, await loadOrgs())
    return { mode: 'own' }
  } catch (err) {
    if (err instanceof TenantError) {
      return assertRecordAccess(actor, student, recordType) // throws TenantError if no access
    }
    throw err
  }
}

/** Apply a former-institution org filter when the access is scoped. */
function scoped<T extends { organizationId?: string | null }>(rows: T[], access: RecordAccess): T[] {
  return access.scopeOrgId ? rows.filter((r) => r.organizationId === access.scopeOrgId) : rows
}

export const studentService = {
  async list(
    actor: SafeUser,
    q: { page?: number; limit?: number; search?: string; status?: string; classId?: Id; gradeLevel?: string } = {},
  ) {
    assertPermission(actor, P.STUDENTS_VIEW)
    let rows = scopeRows(actor, (await studentsRepo.list()) as Student[], await loadOrgs())
    if (q.search) {
      const s = q.search.toLowerCase()
      rows = rows.filter((r) =>
        `${r.firstName} ${r.lastName} ${r.institutionStudentNumber} ${r.studentNumber}`.toLowerCase().includes(s),
      )
    }
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.classId) rows = rows.filter((r) => r.classId === q.classId)
    if (q.gradeLevel) rows = rows.filter((r) => r.gradeLevel === q.gradeLevel)
    return paginate(recent(rows), q.page, q.limit)
  },

  async getById(actor: SafeUser, id: Id): Promise<Student> {
    const student = await requireStudent(id)
    await gate(actor, student)
    return student
  },

  async getByUserId(actor: SafeUser, userId: Id): Promise<Student> {
    const rows = (await studentsRepo.list({ userId })) as Student[]
    const student = rows[0]
    if (!student) throw new NotFoundError('Student profile')
    await gate(actor, student)
    return student
  },

  async profileFor(actor: SafeUser): Promise<{ student: Student; account: SafeUser; className: string | null; enrollment: Enrollment | null }> {
    const student = await this.getByUserId(actor, actor.id)
    const cls = student.classId ? await classesRepo.get(student.classId) : null
    const enrollments = (await enrollmentsRepo.list({ studentId: student.id })) as Enrollment[]
    const active = enrollments.find((e) => e.status === 'ACTIVE') ?? null
    return { student, account: actor, className: cls ? (cls as { name: string }).name : null, enrollment: active }
  },

  async academicFor(actor: SafeUser, studentId: Id): Promise<AcademicRecord[]> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.ACADEMIC_VIEW, 'ACADEMIC_RECORDS')
    return scoped(recent((await academicRepo.list({ studentId })) as AcademicRecord[]), access)
  },

  async attendanceFor(actor: SafeUser, studentId: Id): Promise<AttendanceRecord[]> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.ATTENDANCE_VIEW, 'ATTENDANCE_SUMMARY')
    return scoped(((await attendanceRepo.list({ studentId })) as AttendanceRecord[]).sort((a, b) => (a.date < b.date ? 1 : -1)), access)
  },

  async reportsFor(actor: SafeUser, studentId: Id): Promise<Report[]> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.REPORTS_VIEW, 'REPORTS')
    const rows = (await reportsRepo.list()) as Report[]
    return scoped(recent(rows.filter((r) => r.targetUserId === student.userId && r.status !== 'draft')), access)
  },

  async credentialsFor(actor: SafeUser, studentId: Id): Promise<Credential[]> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.STUDENTS_VIEW, 'CREDENTIALS')
    return scoped((await credentialsRepo.list({ studentId })) as Credential[], access)
  },

  async sessionsFor(actor: SafeUser, studentId: Id): Promise<MentorshipSession[]> {
    const student = await requireStudent(studentId)
    await gate(actor, student)
    const rows = (await sessionsRepo.list({ studentId })) as MentorshipSession[]
    const scrub = actor.role === 'student' || actor.role === 'teacher' || actor.role === 'guardian'
    return rows.map((r) => (scrub ? { ...r, privateNote: '' } : r)).sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  async attendanceRate(actor: SafeUser, studentId: Id): Promise<number> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.ATTENDANCE_VIEW, 'ATTENDANCE_SUMMARY')
    const rows = scoped((await attendanceRepo.list({ studentId })) as AttendanceRecord[], access)
    if (!rows.length) return 0
    const ok = rows.filter((r) => r.status === 'present' || r.status === 'late').length
    return Math.round((ok / rows.length) * 100)
  },

  async academicAverage(actor: SafeUser, studentId: Id): Promise<number> {
    const student = await requireStudent(studentId)
    const access = await gate(actor, student, P.ACADEMIC_VIEW, 'ACADEMIC_RECORDS')
    const rows = scoped((await academicRepo.list({ studentId })) as AcademicRecord[], access)
    if (!rows.length) return 0
    return Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
  },

  // --- registry mutations (institution admin) --------------------------- --

  async create(
    actor: SafeUser,
    input: {
      firstName: string; middleName?: string; lastName: string; dateOfBirth?: string
      gender?: Student['gender']; nationality?: string; gradeLevel: string; classId?: Id | null
      program?: string; studyCode?: string; guardianName?: string; guardianPhone?: string
      guardianEmail?: string; address?: string; email?: string; academicYear?: string
      level: EducationStructureKey
    },
  ): Promise<Student> {
    assertPermission(actor, P.STUDENTS_CREATE)
    const organizationId = actingOrgId(actor)
    if (!input.firstName?.trim() || !input.lastName?.trim()) throw new ValidationError('First and last name are required.')

    const code = await studentCode(usersRepo as never)
    const { hash, salt } = hashPassword('demo123')
    const account = (await usersRepo.create({
      code, passwordHash: hash, passwordSalt: salt, role: 'student', organizationRole: 'student',
      status: 'active', name: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email ?? '', phone: input.guardianPhone ?? '', avatar: null, lastLogin: null,
      failedLogins: 0, lockedUntil: null, permissions: [], organizationId, govScope: null,
    }, actor.id)) as User

    const instNo = `${organizationId.split('-').pop()}-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 8999))}`
    const student = (await studentsRepo.create({
      userId: account.id, organizationId, schoolId: organizationId,
      institutionStudentNumber: instNo, studentNumber: instNo,
      firstName: input.firstName, middleName: input.middleName ?? '', lastName: input.lastName,
      dateOfBirth: input.dateOfBirth || '2010-01-01', gender: input.gender ?? 'other',
      nationality: input.nationality ?? '', gradeLevel: input.gradeLevel, classId: input.classId ?? null,
      program: input.program ?? '', studyCode: input.studyCode ?? '',
      guardianName: input.guardianName ?? '', guardianPhone: input.guardianPhone ?? '',
      guardianEmail: input.guardianEmail ?? '', emergencyContact: input.guardianPhone ?? '',
      address: input.address ?? '', enrollmentDate: new Date().toISOString().slice(0, 10),
      teacherId: null, mentorId: null, skills: [], interests: [], achievements: [],
      status: 'active', profileCompletion: 25,
    }, actor.id)) as Student

    // Open an enrollment record (history-friendly).
    const seq = ((await enrollmentsRepo.list()) as Enrollment[]).length + 1
    await enrollmentsRepo.create({
      id: enrollmentRef(seq), studentId: student.id, organizationId,
      academicYear: input.academicYear ?? String(new Date().getFullYear()),
      level: input.level, gradeLevel: input.gradeLevel, classId: input.classId ?? null,
      studyCode: input.studyCode ?? '', status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10), endDate: null, note: 'Initial enrollment',
    }, actor.id)

    if (student.classId) await addToClass(student.classId, student.id, actor.id)
    await auditService.record({ actor, action: 'STUDENT_CREATED', targetId: student.id, targetType: 'student', organizationId })
    return student
  },

  async update(actor: SafeUser, id: Id, patch: Partial<Student>, expectedVersion?: number): Promise<Student> {
    assertPermission(actor, P.STUDENTS_EDIT)
    const student = await requireStudent(id)
    assertTenant(actor, student, await loadOrgs())
    const { id: _i, userId: _u, organizationId: _o, schoolId: _s, version: _v, ...safe } = patch
    void _i; void _u; void _o; void _s; void _v
    const updated = (await studentsRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as Student
    await auditService.record({ actor, action: 'STUDENT_UPDATED', targetId: id, targetType: 'student', organizationId: student.organizationId, metadata: { fields: Object.keys(safe) } })
    return updated
  },

  async archive(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.STUDENTS_ARCHIVE)
    const student = await requireStudent(id)
    assertTenant(actor, student, await loadOrgs())
    await studentsRepo.update(id, { status: 'archived' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'STUDENT_ARCHIVED', targetId: id, targetType: 'student', organizationId: student.organizationId })
  },

  async assignMentor(actor: SafeUser, studentId: Id, mentorId: Id | null): Promise<Student> {
    assertPermission(actor, P.STUDENTS_ASSIGN)
    const student = await requireStudent(studentId)
    assertTenant(actor, student, await loadOrgs())

    if (student.mentorId) {
      const prev = (await mentorsRepo.get(student.mentorId)) as { assignedStudentIds: Id[] } | null
      if (prev) await mentorsRepo.update(student.mentorId, { assignedStudentIds: prev.assignedStudentIds.filter((s) => s !== studentId) }, { actorId: actor.id })
    }
    if (mentorId) {
      const next = (await mentorsRepo.get(mentorId)) as { assignedStudentIds: Id[]; userId: Id } | null
      if (!next) throw new NotFoundError('Mentor')
      if (!next.assignedStudentIds.includes(studentId)) {
        await mentorsRepo.update(mentorId, { assignedStudentIds: [...next.assignedStudentIds, studentId] }, { actorId: actor.id })
      }
      await notificationService.create({ recipientId: next.userId, type: 'mentorship', title: 'New mentee assigned', message: `${student.firstName} ${student.lastName} has been assigned to you.`, actionUrl: '/teacher/mentorship', organizationId: student.organizationId })
      await notificationService.create({ recipientId: student.userId, type: 'mentorship', title: 'Mentor assigned', message: 'A mentor has been assigned to support your progress.', actionUrl: '/student/mentors', organizationId: student.organizationId })
    }
    const updated = (await studentsRepo.update(studentId, { mentorId }, { actorId: actor.id })) as Student
    await auditService.record({ actor, action: 'MENTOR_ASSIGNED', targetId: studentId, targetType: 'student', organizationId: student.organizationId, metadata: { mentorId } })
    return updated
  },

  async assignTeacher(actor: SafeUser, studentId: Id, teacherId: Id | null): Promise<Student> {
    assertPermission(actor, P.STUDENTS_ASSIGN)
    const student = await requireStudent(studentId)
    assertTenant(actor, student, await loadOrgs())
    const updated = (await studentsRepo.update(studentId, { teacherId }, { actorId: actor.id })) as Student
    await auditService.record({ actor, action: 'TEACHER_ASSIGNED', targetId: studentId, targetType: 'student', organizationId: student.organizationId, metadata: { teacherId } })
    return updated
  },

  async assignClass(actor: SafeUser, studentId: Id, classId: Id | null): Promise<Student> {
    assertPermission(actor, P.STUDENTS_ASSIGN)
    const student = await requireStudent(studentId)
    assertTenant(actor, student, await loadOrgs())
    if (student.classId) await removeFromClass(student.classId, studentId, actor.id)
    if (classId) await addToClass(classId, studentId, actor.id)
    const updated = (await studentsRepo.update(studentId, { classId }, { actorId: actor.id })) as Student
    // keep the active enrollment's class in sync
    const active = ((await enrollmentsRepo.list({ studentId })) as Enrollment[]).find((e) => e.status === 'ACTIVE')
    if (active) await enrollmentsRepo.update(active.id, { classId }, { actorId: actor.id })
    await auditService.record({ actor, action: 'CLASS_ASSIGNED', targetId: studentId, targetType: 'student', organizationId: student.organizationId, metadata: { classId } })
    return updated
  },

  async accountFor(actor: SafeUser, student: Student): Promise<SafeUser | null> {
    await gate(actor, student)
    const u = (await usersRepo.get(student.userId)) as User | null
    return u ? toSafeUser(u) : null
  },
}

async function addToClass(classId: Id, studentId: Id, actorId: Id) {
  const cls = (await classesRepo.get(classId)) as { studentIds: Id[] } | null
  if (cls && !cls.studentIds.includes(studentId)) {
    await classesRepo.update(classId, { studentIds: [...cls.studentIds, studentId] }, { actorId })
  }
}
async function removeFromClass(classId: Id, studentId: Id, actorId: Id) {
  const cls = (await classesRepo.get(classId)) as { studentIds: Id[] } | null
  if (cls) await classesRepo.update(classId, { studentIds: cls.studentIds.filter((s) => s !== studentId) }, { actorId })
}
