import {
  classesRepo, subjectsRepo, teachersRepo, mentorsRepo, usersRepo, studentsRepo, organizationsRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, loadOrgs, actingOrgId,
} from './_shared'
import { NotFoundError } from '../lib/errors'
import { classCode } from '../lib/codes'
import { hashPassword } from '../lib/password'
import type { ClassRecord, Id, Mentor, Organization, SafeUser, Student, Subject, Teacher, User } from '@shared/types'

const orgFilter = <T extends { organizationId?: string | null }>(actor: SafeUser, rows: T[], orgs: Organization[]) =>
  actor.role === 'admin' ? rows : scopeRows(actor, rows, orgs)

export const directoryService = {
  // --- classes ------------------------------------------------------- ----
  async classes(actor: SafeUser): Promise<ClassRecord[]> {
    return orgFilter(actor, (await classesRepo.list()) as ClassRecord[], await loadOrgs())
  },
  async classById(actor: SafeUser, id: Id): Promise<ClassRecord> {
    const c = (await classesRepo.get(id)) as ClassRecord | null
    if (!c) throw new NotFoundError('Class')
    assertTenant(actor, c, await loadOrgs())
    return c
  },
  async createClass(actor: SafeUser, input: Partial<ClassRecord> & { name: string }): Promise<ClassRecord> {
    assertPermission(actor, P.CLASSES_MANAGE)
    const organizationId = actingOrgId(actor)
    const code = input.classCode || classCode(input.gradeLevel ?? '', input.section ?? 'A', input.studyCode ?? '', Number(input.academicYear) || undefined)
    const cls = (await classesRepo.create({
      organizationId, schoolId: organizationId, classCode: code, name: input.name,
      level: input.level ?? 'O_LEVEL', gradeLevel: input.gradeLevel ?? '', section: input.section ?? 'A',
      studyCode: input.studyCode ?? '', academicYear: input.academicYear ?? String(new Date().getFullYear()),
      homeroomTeacherId: input.homeroomTeacherId ?? null, subjectIds: [], studentIds: [],
      capacity: input.capacity ?? 40, room: input.room ?? '', status: 'active',
    }, actor.id)) as ClassRecord
    await auditService.record({ actor, action: 'CLASS_CREATED', targetId: cls.id, targetType: 'class', organizationId })
    return cls
  },
  async updateClass(actor: SafeUser, id: Id, patch: Partial<ClassRecord>, expectedVersion?: number): Promise<ClassRecord> {
    assertPermission(actor, P.CLASSES_MANAGE)
    const c = await this.classById(actor, id)
    const { id: _i, organizationId: _o, version: _v, ...safe } = patch
    void _i; void _o; void _v
    const updated = (await classesRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as ClassRecord
    await auditService.record({ actor, action: 'CLASS_UPDATED', targetId: id, targetType: 'class', organizationId: c.organizationId })
    return updated
  },

  // --- subjects ----------------------------------------------------- -----
  async subjects(actor: SafeUser): Promise<Subject[]> {
    return orgFilter(actor, (await subjectsRepo.list()) as Subject[], await loadOrgs())
  },
  async createSubject(actor: SafeUser, input: Partial<Subject> & { name: string }): Promise<Subject> {
    assertPermission(actor, P.CLASSES_MANAGE)
    const organizationId = actingOrgId(actor)
    const s = (await subjectsRepo.create({
      organizationId, schoolId: organizationId, name: input.name, code: input.code ?? '',
      department: input.department ?? '', description: input.description ?? '',
    }, actor.id)) as Subject
    await auditService.record({ actor, action: 'SUBJECT_CREATED', targetId: s.id, targetType: 'subject', organizationId })
    return s
  },

  // --- teachers ---------------------------------------------------- ------
  async teachers(actor: SafeUser): Promise<Teacher[]> {
    assertPermission(actor, P.TEACHERS_VIEW)
    return orgFilter(actor, (await teachersRepo.list()) as Teacher[], await loadOrgs())
  },
  async teacherById(actor: SafeUser, id: Id): Promise<Teacher> {
    const t = (await teachersRepo.get(id)) as Teacher | null
    if (!t) throw new NotFoundError('Teacher')
    assertTenant(actor, t, await loadOrgs())
    return t
  },
  async teacherForUser(userId: Id): Promise<Teacher | null> {
    return (((await teachersRepo.list({ userId })) as Teacher[])[0]) ?? null
  },
  async createTeacher(
    actor: SafeUser,
    input: { firstName: string; lastName: string; email: string; phone?: string; subjects?: string[]; qualifications?: string[]; experienceYears?: number; isMentor?: boolean; employmentStatus?: Teacher['employmentStatus'] },
  ): Promise<Teacher> {
    assertPermission(actor, P.TEACHERS_MANAGE)
    const organizationId = actingOrgId(actor)
    const { hash, salt } = hashPassword('demo123')
    const account = (await usersRepo.create({
      code: `BOU-TEA-RW-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 899))}`,
      passwordHash: hash, passwordSalt: salt, role: 'teacher', organizationRole: input.isMentor ? 'mentor' : 'teacher',
      status: 'active', name: `${input.firstName} ${input.lastName}`.trim(), email: input.email, phone: input.phone ?? '',
      avatar: null, lastLogin: null, failedLogins: 0, lockedUntil: null, permissions: [], organizationId, govScope: null,
    }, actor.id)) as User
    const teacher = (await teachersRepo.create({
      userId: account.id, organizationId, schoolId: organizationId,
      staffNumber: `${organizationId.split('-').pop()}-T-${String(Math.floor(100 + Math.random() * 899))}`,
      firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone ?? '',
      subjects: input.subjects ?? [], classIds: [], departmentId: null, qualifications: input.qualifications ?? [],
      experienceYears: input.experienceYears ?? 0, employmentStatus: input.employmentStatus ?? 'full_time',
      isMentor: input.isMentor ?? false, isLecturer: false, status: 'active',
    }, actor.id)) as Teacher
    if (input.isMentor) {
      await mentorsRepo.create({
        userId: account.id, organizationId, schoolId: organizationId, specialization: input.subjects?.[0] ?? 'General',
        skills: input.subjects ?? [], experienceYears: input.experienceYears ?? 0, availability: 'By arrangement',
        assignedStudentIds: [], bio: '', status: 'active',
      }, actor.id)
    }
    await auditService.record({ actor, action: 'TEACHER_CREATED', targetId: teacher.id, targetType: 'teacher', organizationId })
    return teacher
  },
  async updateTeacher(actor: SafeUser, id: Id, patch: Partial<Teacher>, expectedVersion?: number): Promise<Teacher> {
    assertPermission(actor, P.TEACHERS_MANAGE)
    const t = await this.teacherById(actor, id)
    const { id: _i, userId: _u, organizationId: _o, version: _v, ...safe } = patch
    void _i; void _u; void _o; void _v
    const updated = (await teachersRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as Teacher
    await auditService.record({ actor, action: 'TEACHER_UPDATED', targetId: id, targetType: 'teacher', organizationId: t.organizationId })
    return updated
  },

  // --- mentors --------------------------------------------------- --------
  async mentors(actor: SafeUser): Promise<Mentor[]> {
    assertPermission(actor, P.MENTORS_VIEW)
    const orgs = await loadOrgs()
    const rows = (await mentorsRepo.list()) as Mentor[]
    if (actor.role === 'admin') return rows
    return rows.filter((m) => !m.organizationId || m.organizationId === actor.organizationId || scopeRows(actor, [m], orgs).length > 0)
  },
  async mentorForUser(userId: Id): Promise<Mentor | null> {
    return (((await mentorsRepo.list({ userId })) as Mentor[])[0]) ?? null
  },

  async studentsForTeacher(actor: SafeUser, teacherId: Id): Promise<Student[]> {
    assertPermission(actor, P.STUDENTS_VIEW)
    const all = scopeRows(actor, (await studentsRepo.list()) as Student[], await loadOrgs())
    return all.filter((s) => s.teacherId === teacherId)
  },

  async orgOf(id: Id): Promise<Organization | null> {
    return (await organizationsRepo.get(id)) as Organization | null
  },

  /** id -> display name, for timelines / audit UIs (any authenticated user). */
  async namesFor(_actor: SafeUser, ids: Id[]): Promise<Record<Id, string>> {
    const set = new Set(ids)
    const out: Record<Id, string> = {}
    for (const u of (await usersRepo.list()) as User[]) if (set.has(u.id)) out[u.id] = u.name
    for (const s of (await studentsRepo.list()) as Student[]) if (set.has(s.id)) out[s.id] = `${s.firstName} ${s.lastName}`
    for (const id of ids) if (!out[id]) out[id] = id === 'system' ? 'System' : id
    return out
  },
}
