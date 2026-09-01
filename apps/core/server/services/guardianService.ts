import {
  guardianLinksRepo, studentsRepo, usersRepo, organizationsRepo, attendanceRepo,
  assessmentsRepo, reportCardsRepo, announcementsRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, auditService, notificationService, loadOrgs, recent,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { hashPassword } from '../lib/password'
import { reference } from '../lib/codes'
import { toSafeUser } from './authService'
import { attendanceService } from './attendanceService'
import type {
  Announcement, Assessment, AttendanceRecord, GuardianLink, GuardianRelationship, Id, Organization,
  RecordType, ReportCard, SafeUser, Student, User,
} from '@shared/types'

const GUARDIAN_VIEWABLE: RecordType[] = ['IDENTITY', 'ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY', 'REPORTS']

async function requireStudent(id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  return s
}

async function activeLink(guardianUserId: Id, studentId: Id): Promise<GuardianLink> {
  const link = ((await guardianLinksRepo.list({ guardianUserId })) as GuardianLink[]).find(
    (l) => l.studentId === studentId && l.status === 'active',
  )
  if (!link) throw new NotFoundError('Child')
  return link
}

export const guardianService = {
  // --- guardian portal ------------------------------------------------- ---

  async myChildren(actor: SafeUser): Promise<{
    link: GuardianLink
    student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'gradeLevel' | 'institutionStudentNumber'>
    organizationName: string
    attendanceRate: number
    latestReportCard: { id: Id; term: string; gpa: number } | null
    openConcerns: number
  }[]> {
    assertPermission(actor, P.GUARDIAN_PORTAL)
    const links = ((await guardianLinksRepo.list({ guardianUserId: actor.id })) as GuardianLink[]).filter((l) => l.status === 'active')
    return Promise.all(links.map(async (link) => {
      const student = await requireStudent(link.studentId)
      const org = (await organizationsRepo.get(student.organizationId)) as Organization | null
      const att = (await attendanceRepo.list({ studentId: student.id })) as AttendanceRecord[]
      const attended = att.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'excused').length
      const cards = ((await reportCardsRepo.list({ studentId: student.id })) as ReportCard[])
        .filter((r) => r.status === 'published')
        .sort((a, b) => (a.publishedAt! < b.publishedAt! ? 1 : -1))
      return {
        link,
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName, gradeLevel: student.gradeLevel, institutionStudentNumber: student.institutionStudentNumber },
        organizationName: org?.officialName ?? student.organizationId,
        attendanceRate: att.length ? Math.round((attended / att.length) * 100) : 0,
        latestReportCard: cards[0] ? { id: cards[0].id, term: cards[0].term, gpa: cards[0].gpa } : null,
        openConcerns: 0,
      }
    }))
  },

  async childOverview(actor: SafeUser, studentId: Id): Promise<{
    student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'gradeLevel' | 'program' | 'institutionStudentNumber'>
    organizationName: string
    relationship: GuardianRelationship
    assessments: Assessment[]
    attendance: AttendanceRecord[]
    attendanceRate: number
    reportCards: ReportCard[]
    announcements: Announcement[]
  }> {
    assertPermission(actor, P.GUARDIAN_PORTAL)
    const link = await activeLink(actor.id, studentId)
    const student = await requireStudent(studentId)
    const org = (await organizationsRepo.get(student.organizationId)) as Organization | null

    const assessments = link.canViewRecordTypes.includes('ACADEMIC_RECORDS')
      ? recent((await assessmentsRepo.list({ studentId })) as Assessment[])
      : []
    const attendance = link.canViewRecordTypes.includes('ATTENDANCE_SUMMARY')
      ? ((await attendanceRepo.list({ studentId })) as AttendanceRecord[]).sort((a, b) => (a.date < b.date ? 1 : -1))
      : []
    const attended = attendance.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'excused').length
    const reportCards = link.canViewRecordTypes.includes('REPORTS')
      ? recent(((await reportCardsRepo.list({ studentId })) as ReportCard[]).filter((r) => r.status === 'published'))
      : []
    const announcements = ((await announcementsRepo.list()) as Announcement[])
      .filter((a) => a.organizationId === student.organizationId && (a.audience === 'all' || (Array.isArray(a.audience) && (a.audience.includes('student') || a.audience.includes('guardian')))))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 10)

    return {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName, gradeLevel: student.gradeLevel, program: student.program, institutionStudentNumber: student.institutionStudentNumber },
      organizationName: org?.officialName ?? student.organizationId,
      relationship: link.relationship,
      assessments, attendance, attendanceRate: attendance.length ? Math.round((attended / attendance.length) * 100) : 0,
      reportCards, announcements,
    }
  },

  async requestExcuse(actor: SafeUser, attendanceId: Id, reason: string): Promise<AttendanceRecord> {
    assertPermission(actor, P.GUARDIAN_PORTAL)
    return attendanceService.requestExcuse(actor, attendanceId, reason)
  },

  // --- school-side link management ---------------------------------- ------

  async links(actor: SafeUser, q: { studentId?: Id } = {}): Promise<(GuardianLink & { guardianName: string; studentName: string })[]> {
    assertPermission(actor, P.GUARDIAN_LINK_MANAGE)
    const orgs = await loadOrgs()
    let rows = (await guardianLinksRepo.list()) as GuardianLink[]
    if (q.studentId) rows = rows.filter((r) => r.studentId === q.studentId)
    const mine: GuardianLink[] = []
    for (const l of rows) {
      const student = (await studentsRepo.get(l.studentId)) as Student | null
      if (student) {
        try { assertTenant(actor, student, orgs); mine.push(l) } catch { /* other tenant */ }
      }
    }
    return Promise.all(mine.map(async (l) => {
      const g = (await usersRepo.get(l.guardianUserId)) as User | null
      const s = (await studentsRepo.get(l.studentId)) as Student | null
      return { ...l, guardianName: g?.name ?? l.guardianUserId, studentName: s ? `${s.firstName} ${s.lastName}` : l.studentId }
    }))
  },

  /**
   * The institution links a guardian to one of its students. If no guardian
   * account matches, one is created (school-verified). The link is `active`.
   */
  async linkGuardian(
    actor: SafeUser,
    input: {
      studentId: Id
      guardianCode?: string
      name?: string
      email?: string
      phone?: string
      relationship: GuardianRelationship
      canViewRecordTypes?: RecordType[]
      isPrimary?: boolean
    },
  ): Promise<{ link: GuardianLink; guardian: SafeUser; created: boolean; guardianCode: string }> {
    assertPermission(actor, P.GUARDIAN_LINK_MANAGE)
    const student = await requireStudent(input.studentId)
    assertTenant(actor, student, await loadOrgs())

    const users = (await usersRepo.list()) as User[]
    let guardian = input.guardianCode
      ? users.find((u) => u.code.toLowerCase() === input.guardianCode!.trim().toLowerCase() && u.role === 'guardian')
      : input.email
        ? users.find((u) => u.role === 'guardian' && u.email.toLowerCase() === input.email!.trim().toLowerCase())
        : undefined
    let created = false
    let plainCode = guardian?.code ?? ''

    if (!guardian) {
      if (!input.name?.trim()) throw new ValidationError('Provide the guardian’s name (or an existing guardian code).')
      const year = new Date().getFullYear()
      plainCode = `BOU-GDN-${year}-${Math.floor(1000 + Math.random() * 8999)}`
      const { hash, salt } = hashPassword('demo123')
      guardian = (await usersRepo.create({
        code: plainCode, passwordHash: hash, passwordSalt: salt, role: 'guardian', organizationRole: null,
        status: 'active', name: input.name.trim(), email: input.email ?? '', phone: input.phone ?? '',
        avatar: null, lastLogin: null, failedLogins: 0, lockedUntil: null, permissions: [],
        organizationId: null, govScope: null,
      }, actor.id)) as User
      created = true
    }

    const existing = ((await guardianLinksRepo.list({ guardianUserId: guardian.id })) as GuardianLink[]).find((l) => l.studentId === student.id)
    if (existing && existing.status === 'active') throw new ValidationError('That guardian is already linked to this student.')

    const canView = (input.canViewRecordTypes?.length ? input.canViewRecordTypes : GUARDIAN_VIEWABLE).filter((t) => GUARDIAN_VIEWABLE.includes(t))
    let link: GuardianLink
    if (existing) {
      link = (await guardianLinksRepo.update(existing.id, {
        status: 'active', relationship: input.relationship, canViewRecordTypes: canView,
        isPrimary: input.isPrimary ?? existing.isPrimary, verifiedAt: new Date().toISOString(),
      }, { actorId: actor.id })) as GuardianLink
    } else {
      const id = await reference(guardianLinksRepo as never, 'GDL')
      link = (await guardianLinksRepo.create({
        id, guardianUserId: guardian.id, studentId: student.id, organizationId: student.organizationId,
        relationship: input.relationship, status: 'active', canViewRecordTypes: canView,
        isPrimary: input.isPrimary ?? false, addedBy: actor.id, verifiedAt: new Date().toISOString(),
      }, actor.id)) as GuardianLink
    }

    await auditService.record({ actor, action: 'GUARDIAN_LINKED', targetId: link.id, targetType: 'guardianLink', organizationId: student.organizationId, metadata: { studentId: student.id, guardianId: guardian.id, created } })
    await notificationService.create({ recipientId: guardian.id, type: 'system', title: 'Linked to a student', message: `You now have guardian access to ${student.firstName} ${student.lastName}.`, actionUrl: '/guardian/children' })
    return { link, guardian: toSafeUser(guardian), created, guardianCode: plainCode }
  },

  async updateLink(actor: SafeUser, id: Id, patch: { canViewRecordTypes?: RecordType[]; relationship?: GuardianRelationship; isPrimary?: boolean }): Promise<GuardianLink> {
    assertPermission(actor, P.GUARDIAN_LINK_MANAGE)
    const link = (await guardianLinksRepo.get(id)) as GuardianLink | null
    if (!link) throw new NotFoundError('Guardian link')
    const student = await requireStudent(link.studentId)
    assertTenant(actor, student, await loadOrgs())
    const next: Partial<GuardianLink> = {}
    if (patch.canViewRecordTypes) next.canViewRecordTypes = patch.canViewRecordTypes.filter((t) => GUARDIAN_VIEWABLE.includes(t))
    if (patch.relationship) next.relationship = patch.relationship
    if (patch.isPrimary !== undefined) next.isPrimary = patch.isPrimary
    return guardianLinksRepo.update(id, next, { actorId: actor.id }) as Promise<GuardianLink>
  },

  async revokeLink(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.GUARDIAN_LINK_MANAGE)
    const link = (await guardianLinksRepo.get(id)) as GuardianLink | null
    if (!link) throw new NotFoundError('Guardian link')
    const student = await requireStudent(link.studentId)
    assertTenant(actor, student, await loadOrgs())
    await guardianLinksRepo.update(id, { status: 'revoked' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'GUARDIAN_LINK_REVOKED', targetId: id, targetType: 'guardianLink', organizationId: student.organizationId, metadata: { studentId: link.studentId } })
    await notificationService.create({ recipientId: link.guardianUserId, type: 'system', title: 'Guardian access removed', message: `Your access to ${student.firstName} ${student.lastName} has been withdrawn.`, actionUrl: '/guardian' })
  },
}
