import {
  assessmentSchemesRepo, assessmentsRepo, reportCardsRepo, studentsRepo, classesRepo,
  academicRepo, attendanceRepo, enrollmentsRepo, guardianLinksRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, notificationService,
  loadOrgs, actingOrgId, recent,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import { assertRecordAccess } from '../lib/records'
import type {
  AcademicRecord, Assessment, AssessmentScheme, AttendanceRecord, ClassRecord, EducationStructureKey,
  Enrollment, GradeBand, GuardianLink, Id, ReportCard, ReportCardLine, SafeUser, Student,
} from '@shared/types'

const DEFAULT_BANDS: GradeBand[] = [
  { min: 80, letter: 'A', gpa: 4, label: 'Excellent' },
  { min: 70, letter: 'B', gpa: 3, label: 'Good' },
  { min: 60, letter: 'C', gpa: 2, label: 'Satisfactory' },
  { min: 50, letter: 'D', gpa: 1, label: 'Pass' },
  { min: 0, letter: 'F', gpa: 0, label: 'Fail' },
]

function bandFor(bands: GradeBand[], score: number): GradeBand {
  const sorted = [...bands].sort((a, b) => b.min - a.min)
  return sorted.find((b) => score >= b.min) ?? sorted[sorted.length - 1] ?? DEFAULT_BANDS[4]
}

async function requireStudent(id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  return s
}

export interface TranscriptTermRow {
  academicYear: string
  term: string
  organizationId: Id
  classId: Id | null
  subjects: { subjectName: string; score: number | null; grade: string }[]
  gpa: number | null
  average: number | null
  position: number | null
}

export interface TranscriptResult {
  student: { id: Id; name: string; number: string }
  terms: TranscriptTermRow[]
  cumulativeGpa: number
  credentialsCount: number
}

export interface AssessmentInput {
  studentId: Id
  subjectId: Id
  subjectName?: string
  classId?: Id | null
  academicYear: string
  term: string
  componentKey: string
  title: string
  score: number
  maxScore?: number
  date?: string
  comment?: string
}

export const academicService = {
  // --- schemes -------------------------------------------------------- ----

  async schemes(actor: SafeUser): Promise<AssessmentScheme[]> {
    assertPermission(actor, P.ACADEMIC_VIEW)
    return recent(scopeRows(actor, (await assessmentSchemesRepo.list()) as AssessmentScheme[], await loadOrgs()))
  },

  async createScheme(
    actor: SafeUser,
    input: { name: string; level: EducationStructureKey; components: AssessmentScheme['components']; gradeBands?: GradeBand[]; passMark?: number; isDefault?: boolean },
  ): Promise<AssessmentScheme> {
    assertPermission(actor, P.SCHEME_MANAGE)
    const organizationId = actingOrgId(actor)
    validateComponents(input.components)
    const bands = input.gradeBands?.length ? input.gradeBands : DEFAULT_BANDS
    if (input.isDefault) await this.clearDefault(organizationId, input.level, actor.id)
    const scheme = (await assessmentSchemesRepo.create({
      organizationId, name: input.name.trim(), level: input.level,
      components: input.components, gradeBands: bands, passMark: input.passMark ?? 50,
      isDefault: input.isDefault ?? false,
    }, actor.id)) as AssessmentScheme
    await auditService.record({ actor, action: 'SCHEME_CREATED', targetId: scheme.id, targetType: 'assessmentScheme', organizationId })
    return scheme
  },

  async updateScheme(actor: SafeUser, id: Id, patch: Partial<AssessmentScheme>, expectedVersion?: number): Promise<AssessmentScheme> {
    assertPermission(actor, P.SCHEME_MANAGE)
    const scheme = (await assessmentSchemesRepo.get(id)) as AssessmentScheme | null
    if (!scheme) throw new NotFoundError('Scheme')
    assertTenant(actor, scheme, await loadOrgs())
    if (patch.components) validateComponents(patch.components)
    if (patch.isDefault) await this.clearDefault(scheme.organizationId, patch.level ?? scheme.level, actor.id)
    const { id: _i, organizationId: _o, version: _v, ...safe } = patch
    void _i; void _o; void _v
    const updated = (await assessmentSchemesRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as AssessmentScheme
    await auditService.record({ actor, action: 'SCHEME_UPDATED', targetId: id, targetType: 'assessmentScheme', organizationId: scheme.organizationId })
    return updated
  },

  async clearDefault(organizationId: Id, level: EducationStructureKey, actorId: Id): Promise<void> {
    const rows = ((await assessmentSchemesRepo.list()) as AssessmentScheme[]).filter(
      (s) => s.organizationId === organizationId && s.level === level && s.isDefault,
    )
    for (const s of rows) await assessmentSchemesRepo.update(s.id, { isDefault: false }, { actorId })
  },

  async schemeFor(organizationId: Id, level: EducationStructureKey): Promise<AssessmentScheme | null> {
    const rows = ((await assessmentSchemesRepo.list()) as AssessmentScheme[]).filter((s) => s.organizationId === organizationId)
    return rows.find((s) => s.level === level && s.isDefault) ?? rows.find((s) => s.level === level) ?? rows.find((s) => s.isDefault) ?? null
  },

  // --- assessments -------------------------------------------------- ------

  async assessments(
    actor: SafeUser,
    q: { studentId?: Id; classId?: Id; subjectId?: Id; term?: string } = {},
  ): Promise<Assessment[]> {
    assertPermission(actor, P.ACADEMIC_VIEW)
    let rows = scopeRows(actor, (await assessmentsRepo.list()) as Assessment[], await loadOrgs())
    if (q.studentId) rows = rows.filter((r) => r.studentId === q.studentId)
    if (q.classId) rows = rows.filter((r) => r.classId === q.classId)
    if (q.subjectId) rows = rows.filter((r) => r.subjectId === q.subjectId)
    if (q.term) rows = rows.filter((r) => r.term === q.term)
    return recent(rows)
  },

  async recordAssessment(actor: SafeUser, input: AssessmentInput): Promise<Assessment> {
    assertPermission(actor, P.ASSESSMENT_MANAGE)
    const student = await requireStudent(input.studentId)
    assertTenant(actor, student, await loadOrgs())
    if (!Number.isFinite(input.score) || input.score < 0) throw new ValidationError('A valid score is required.')
    const maxScore = input.maxScore && input.maxScore > 0 ? input.maxScore : 100
    if (input.score > maxScore) throw new ValidationError('Score cannot exceed the maximum.')

    const record = (await assessmentsRepo.create({
      studentId: student.id, organizationId: student.organizationId, classId: input.classId ?? student.classId ?? null,
      subjectId: input.subjectId, subjectName: input.subjectName ?? '', academicYear: input.academicYear,
      term: input.term, componentKey: input.componentKey, title: input.title ?? input.componentKey,
      score: input.score, maxScore, date: input.date || new Date().toISOString().slice(0, 10),
      teacherId: actor.id, comment: input.comment ?? '',
    }, actor.id)) as Assessment
    await auditService.record({ actor, action: 'ASSESSMENT_RECORDED', targetId: record.id, targetType: 'assessment', organizationId: student.organizationId, metadata: { studentId: student.id, subjectId: input.subjectId, component: input.componentKey } })
    await notificationService.create({ recipientId: student.userId, type: 'academic', title: 'New assessment mark', message: `${input.subjectName ?? 'Subject'} — ${input.title}: ${input.score}/${maxScore}`, actionUrl: '/student/academic', organizationId: student.organizationId })
    return record
  },

  async bulkRecordAssessments(actor: SafeUser, entries: AssessmentInput[]): Promise<{ saved: number }> {
    let saved = 0
    for (const e of entries) {
      if (e && Number.isFinite(e.score)) {
        await this.recordAssessment(actor, e)
        saved += 1
      }
    }
    return { saved }
  },

  // --- report cards ----------------------------------------------- --------

  /** Compute (without saving) a report card for one student in a class/term. */
  async computeReportCard(
    actor: SafeUser,
    input: { studentId: Id; classId: Id; term: string; academicYear: string },
  ): Promise<ReportCard> {
    assertPermission(actor, P.ACADEMIC_VIEW)
    const student = await requireStudent(input.studentId)
    assertTenant(actor, student, await loadOrgs())
    const cls = (await classesRepo.get(input.classId)) as ClassRecord | null
    if (!cls) throw new NotFoundError('Class')
    assertTenant(actor, cls, await loadOrgs())

    const scheme = await this.schemeFor(student.organizationId, cls.level)
    const allAssessments = (await assessmentsRepo.list()) as Assessment[]
    const classmates = ((await studentsRepo.list()) as Student[]).filter((s) => cls.studentIds.includes(s.id))

    // per-student, per-subject weighted score for the whole class (for positions)
    const subjectIds = cls.subjectIds.length ? cls.subjectIds : uniq(allAssessments.filter((a) => a.classId === cls.id && a.term === input.term).map((a) => a.subjectId))
    const board = new Map<Id, Map<Id, number | null>>() // studentId -> subjectId -> weighted
    for (const s of classmates) {
      const m = new Map<Id, number | null>()
      for (const subjectId of subjectIds) {
        m.set(subjectId, weightedFor(allAssessments, s.id, subjectId, input.term, scheme))
      }
      board.set(s.id, m)
    }

    const positionInSubject = (subjectId: Id, value: number | null): number | null => {
      if (value === null) return null
      const scores = [...board.values()].map((m) => m.get(subjectId)).filter((v): v is number => v !== null)
      return scores.filter((v) => v > value).length + 1
    }

    const bands = scheme?.gradeBands ?? DEFAULT_BANDS
    const lines: ReportCardLine[] = subjectIds.map((subjectId) => {
      const weighted = board.get(student.id)?.get(subjectId) ?? null
      const b = weighted === null ? { letter: '—', gpa: 0 } : bandFor(bands, weighted)
      const components = (scheme?.components ?? [{ key: 'overall', label: 'Overall', weight: 100 }]).map((c) => ({
        key: c.key, label: c.label, weight: c.weight,
        percent: componentPercent(allAssessments, student.id, subjectId, input.term, c.key),
      }))
      const name = allAssessments.find((a) => a.subjectId === subjectId && a.subjectName)?.subjectName
        || (cls.subjectIds.includes(subjectId) ? subjectId : subjectId)
      return {
        subjectId, subjectName: name, components,
        weightedScore: weighted === null ? null : round1(weighted),
        letter: b.letter, gpa: b.gpa,
        position: positionInSubject(subjectId, weighted),
        remark: weighted === null ? 'No marks recorded' : weighted >= (scheme?.passMark ?? 50) ? 'Pass' : 'Below pass mark',
      }
    })

    const graded = lines.filter((l) => l.weightedScore !== null)
    const average = graded.length ? round1(graded.reduce((s, l) => s + (l.weightedScore ?? 0), 0) / graded.length) : 0
    const gpa = graded.length ? round2(graded.reduce((s, l) => s + l.gpa, 0) / graded.length) : 0

    // overall position
    const classAverages = classmates.map((s) => {
      const vals = [...(board.get(s.id)?.values() ?? [])].filter((v): v is number => v !== null)
      return { id: s.id, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
    })
    const myAvg = classAverages.find((c) => c.id === student.id)?.avg ?? null
    const overallPosition = myAvg === null ? null
      : classAverages.filter((c) => c.avg !== null && c.avg > myAvg).length + 1

    const attendance = (await attendanceRepo.list({ studentId: student.id })) as AttendanceRecord[]
    const present = attendance.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'excused').length
    const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0

    const now = new Date().toISOString()
    return {
      id: 'unsaved', reference: 'unsaved', studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`, classId: cls.id,
      academicYear: input.academicYear, term: input.term, schemeId: scheme?.id ?? null,
      lines, gpa, average, overallPosition, classSize: classmates.length, attendanceRate,
      conduct: '', headTeacherRemark: '', status: 'draft', publishedAt: null, publishedBy: null,
      organizationId: student.organizationId, version: 0, createdAt: now, updatedAt: now,
    }
  },

  /** School generates + stores a draft report card per student in a class. */
  async generateReportCards(
    actor: SafeUser,
    input: { classId: Id; term: string; academicYear: string },
  ): Promise<{ created: number; updated: number }> {
    assertPermission(actor, P.REPORTCARD_MANAGE)
    const cls = (await classesRepo.get(input.classId)) as ClassRecord | null
    if (!cls) throw new NotFoundError('Class')
    assertTenant(actor, cls, await loadOrgs())
    const existing = (await reportCardsRepo.list()) as ReportCard[]
    let created = 0
    let updated = 0
    for (const studentId of cls.studentIds) {
      const computed = await this.computeReportCard(actor, { studentId, classId: cls.id, term: input.term, academicYear: input.academicYear })
      const prior = existing.find((r) => r.studentId === studentId && r.term === input.term && r.academicYear === input.academicYear)
      if (prior) {
        if (prior.status === 'published') continue
        await reportCardsRepo.update(prior.id, {
          lines: computed.lines, gpa: computed.gpa, average: computed.average,
          overallPosition: computed.overallPosition, classSize: computed.classSize,
          attendanceRate: computed.attendanceRate, schemeId: computed.schemeId,
        }, { actorId: actor.id })
        updated += 1
      } else {
        const ref = await reference(reportCardsRepo as never, 'RPC')
        await reportCardsRepo.create({
          id: ref, reference: ref, studentId: computed.studentId, studentName: computed.studentName,
          classId: cls.id, academicYear: input.academicYear, term: input.term, schemeId: computed.schemeId,
          lines: computed.lines, gpa: computed.gpa, average: computed.average,
          overallPosition: computed.overallPosition, classSize: computed.classSize,
          attendanceRate: computed.attendanceRate, conduct: '', headTeacherRemark: '',
          status: 'draft', publishedAt: null, publishedBy: null, organizationId: cls.organizationId,
        }, actor.id)
        created += 1
      }
    }
    await auditService.record({ actor, action: 'REPORT_CARDS_GENERATED', targetId: cls.id, targetType: 'class', organizationId: cls.organizationId, metadata: { term: input.term, created, updated } })
    return { created, updated }
  },

  async reportCards(
    actor: SafeUser,
    q: { studentId?: Id; classId?: Id; term?: string; status?: ReportCard['status'] } = {},
  ): Promise<ReportCard[]> {
    let rows = (await reportCardsRepo.list()) as ReportCard[]
    if (q.studentId) rows = rows.filter((r) => r.studentId === q.studentId)
    if (q.classId) rows = rows.filter((r) => r.classId === q.classId)
    if (q.term) rows = rows.filter((r) => r.term === q.term)
    if (q.status) rows = rows.filter((r) => r.status === q.status)

    if (actor.role === 'student') {
      const mine = ((await studentsRepo.list({ userId: actor.id })) as Student[])[0]
      rows = rows.filter((r) => mine && r.studentId === mine.id && r.status === 'published')
    } else if (actor.role === 'guardian') {
      const links = (await guardianLinksRepo.list({ guardianUserId: actor.id })) as GuardianLink[]
      const childIds = new Set(links.filter((l) => l.status === 'active').map((l) => l.studentId))
      rows = rows.filter((r) => childIds.has(r.studentId) && r.status === 'published')
    } else {
      assertPermission(actor, P.ACADEMIC_VIEW)
      rows = scopeRows(actor, rows, await loadOrgs())
    }
    return recent(rows)
  },

  async getReportCard(actor: SafeUser, id: Id): Promise<ReportCard> {
    const rc = (await reportCardsRepo.get(id)) as ReportCard | null
    if (!rc) throw new NotFoundError('Report card')
    if (actor.role === 'student') {
      const mine = ((await studentsRepo.list({ userId: actor.id })) as Student[])[0]
      if (!mine || rc.studentId !== mine.id || rc.status !== 'published') throw new NotFoundError('Report card')
    } else if (actor.role === 'guardian') {
      const student = await requireStudent(rc.studentId)
      await assertRecordAccess(actor, student, 'REPORTS')
      if (rc.status !== 'published') throw new NotFoundError('Report card')
    } else {
      assertPermission(actor, P.ACADEMIC_VIEW)
      assertTenant(actor, rc, await loadOrgs())
    }
    return rc
  },

  async updateReportCard(actor: SafeUser, id: Id, patch: { conduct?: string; headTeacherRemark?: string }): Promise<ReportCard> {
    assertPermission(actor, P.REPORTCARD_MANAGE)
    const rc = (await reportCardsRepo.get(id)) as ReportCard | null
    if (!rc) throw new NotFoundError('Report card')
    assertTenant(actor, rc, await loadOrgs())
    if (rc.status === 'published') throw new ValidationError('A published report card cannot be edited.')
    return reportCardsRepo.update(id, { conduct: patch.conduct ?? rc.conduct, headTeacherRemark: patch.headTeacherRemark ?? rc.headTeacherRemark }, { actorId: actor.id }) as Promise<ReportCard>
  },

  async publishReportCard(actor: SafeUser, id: Id): Promise<ReportCard> {
    assertPermission(actor, P.REPORTCARD_PUBLISH)
    const rc = (await reportCardsRepo.get(id)) as ReportCard | null
    if (!rc) throw new NotFoundError('Report card')
    assertTenant(actor, rc, await loadOrgs())
    if (rc.status === 'published') return rc
    const updated = (await reportCardsRepo.update(id, { status: 'published', publishedAt: new Date().toISOString(), publishedBy: actor.id }, { actorId: actor.id })) as ReportCard

    const student = await requireStudent(rc.studentId)
    await notificationService.create({ recipientId: student.userId, type: 'academic', title: 'Report card published', message: `Your ${rc.term} report card is available.`, actionUrl: '/student/report-cards', organizationId: rc.organizationId })
    const guardians = ((await guardianLinksRepo.list({ studentId: rc.studentId })) as GuardianLink[]).filter((l) => l.status === 'active')
    for (const g of guardians) {
      await notificationService.create({ recipientId: g.guardianUserId, type: 'academic', title: 'Report card published', message: `${rc.studentName}'s ${rc.term} report card is available.`, actionUrl: '/guardian/children' })
    }
    await auditService.record({ actor, action: 'REPORT_CARD_PUBLISHED', targetId: id, targetType: 'reportCard', organizationId: rc.organizationId, metadata: { studentId: rc.studentId } })
    return updated
  },

  // --- transcript ------------------------------------------------- --------

  /** A cumulative academic transcript across terms/years and institutions. */
  async transcript(actor: SafeUser, studentId: Id): Promise<TranscriptResult> {
    const student = await requireStudent(studentId)
    // gate: self, own tenant, guardian, active grant, or former institution
    if (actor.role === 'student') {
      if (student.userId !== actor.id) throw new NotFoundError('Transcript')
    } else {
      try {
        assertTenant(actor, student, await loadOrgs())
      } catch {
        await assertRecordAccess(actor, student, 'ACADEMIC_RECORDS')
      }
    }

    const cards = ((await reportCardsRepo.list({ studentId })) as ReportCard[]).filter((r) => r.status === 'published')
    const legacy = (await academicRepo.list({ studentId })) as AcademicRecord[]
    const enrollments = (await enrollmentsRepo.list({ studentId })) as Enrollment[]

    const terms: TranscriptTermRow[] = cards
      .sort((a, b) => (a.academicYear + a.term < b.academicYear + b.term ? -1 : 1))
      .map((c) => ({
        academicYear: c.academicYear, term: c.term, organizationId: c.organizationId, classId: c.classId,
        subjects: c.lines.map((l) => ({ subjectName: l.subjectName, score: l.weightedScore, grade: l.letter })),
        gpa: c.gpa, average: c.average, position: c.overallPosition,
      }))

    // fold in legacy per-subject grades that aren't covered by a report card
    const covered = new Set(terms.map((t) => `${t.academicYear}|${t.term}`))
    const byTerm = new Map<string, AcademicRecord[]>()
    for (const r of legacy) {
      const enr = enrollments.find((e) => e.organizationId === r.organizationId)
      const key = `${enr?.academicYear ?? 'n/a'}|${r.term}`
      if (covered.has(key)) continue
      byTerm.set(key, [...(byTerm.get(key) ?? []), r])
    }
    for (const [key, rows] of byTerm) {
      const [academicYear, term] = key.split('|')
      terms.push({
        academicYear, term, organizationId: rows[0].organizationId, classId: null,
        subjects: rows.map((r) => ({ subjectName: r.subjectName, score: r.score, grade: r.grade })),
        gpa: null, average: rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : null,
        position: null,
      })
    }

    const gpas = terms.map((t) => t.gpa).filter((g): g is number => g !== null)
    return {
      student: { id: student.id, name: `${student.firstName} ${student.lastName}`, number: student.institutionStudentNumber },
      terms: terms.sort((a, b) => (a.academicYear + a.term < b.academicYear + b.term ? -1 : 1)),
      cumulativeGpa: gpas.length ? round2(gpas.reduce((a, b) => a + b, 0) / gpas.length) : 0,
      credentialsCount: 0,
    }
  },
}

function validateComponents(components: { key: string; weight: number }[]): void {
  if (!components?.length) throw new ValidationError('Add at least one assessment component.')
  const keys = new Set<string>()
  for (const c of components) {
    if (!c.key?.trim()) throw new ValidationError('Every component needs a key.')
    if (keys.has(c.key)) throw new ValidationError(`Duplicate component key: ${c.key}`)
    keys.add(c.key)
    if (!(c.weight >= 0)) throw new ValidationError('Component weights must be non-negative.')
  }
  const sum = components.reduce((s, c) => s + c.weight, 0)
  if (Math.round(sum) !== 100) throw new ValidationError(`Component weights must sum to 100 (got ${sum}).`)
}

function componentPercent(all: Assessment[], studentId: Id, subjectId: Id, term: string, componentKey: string): number | null {
  const rows = all.filter((a) => a.studentId === studentId && a.subjectId === subjectId && a.term === term && a.componentKey === componentKey)
  if (!rows.length) return null
  return round1(rows.reduce((s, a) => s + (a.score / (a.maxScore || 100)) * 100, 0) / rows.length)
}

function weightedFor(all: Assessment[], studentId: Id, subjectId: Id, term: string, scheme: AssessmentScheme | null): number | null {
  const components = scheme?.components ?? [{ key: 'overall', label: 'Overall', weight: 100 }]
  let num = 0
  let den = 0
  for (const c of components) {
    const pct = componentPercent(all, studentId, subjectId, term, c.key)
    if (pct === null) continue
    num += pct * c.weight
    den += c.weight
  }
  return den === 0 ? null : num / den
}

const uniq = <T,>(a: T[]): T[] => [...new Set(a)]
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100
