import { studentsRepo, usersRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, auditService, actingOrgId,
} from './_shared'
import { ValidationError } from '../lib/errors'
import { studentService } from './studentService'
import { directoryService } from './directoryService'
import { guardianService } from './guardianService'
import type {
  EducationStructureKey, GuardianRelationship, Id, ImportKind, ImportReport, ImportRowResult,
  SafeUser, Student, User,
} from '@shared/types'

/** Minimal RFC-4180-ish CSV parser (handles quotes + embedded commas/newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { record.push(field); field = '' }
    else if (c === '\n') { record.push(field); rows.push(record); record = []; field = '' }
    else field += c
  }
  if (field.length || record.length) { record.push(field); rows.push(record) }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (nonEmpty.length < 1) return []
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return nonEmpty.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const REQUIRED: Record<ImportKind, string[]> = {
  students: ['first_name', 'last_name', 'grade_level', 'level'],
  teachers: ['first_name', 'last_name', 'email'],
  guardians: ['student_number', 'name', 'relationship'],
}

const RELS: GuardianRelationship[] = ['mother', 'father', 'guardian', 'other']

export const importService = {
  /** Validate CSV rows without writing anything — returns a per-row report. */
  async validate(actor: SafeUser, kind: ImportKind, csvText: string): Promise<ImportReport> {
    assertPermission(actor, P.IMPORT_DATA)
    const organizationId = actingOrgId(actor)
    const parsed = parseCsv(csvText)
    if (!parsed.length) throw new ValidationError('No data rows found in the file.')

    const students = kind !== 'students' ? ((await studentsRepo.list()) as Student[]).filter((s) => s.organizationId === organizationId) : []
    const users = (await usersRepo.list()) as User[]
    const seen = new Set<string>()
    const rows: ImportRowResult[] = parsed.map((data, idx) => {
      const errors: string[] = []
      const warnings: string[] = []
      for (const req of REQUIRED[kind]) if (!data[req]) errors.push(`missing "${req}"`)

      if (kind === 'students') {
        const key = `${data.first_name}|${data.last_name}|${data.grade_level}`.toLowerCase()
        if (seen.has(key)) errors.push('duplicate row in file')
        seen.add(key)
        if (data.email && users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) warnings.push('an account with this email already exists')
      }
      if (kind === 'teachers') {
        if (!/^[^@\s]+@[^@\s]+$/.test(data.email)) errors.push('invalid email')
        if (seen.has(data.email.toLowerCase())) errors.push('duplicate email in file')
        seen.add(data.email.toLowerCase())
        if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) errors.push('a user with this email already exists')
      }
      if (kind === 'guardians') {
        if (!RELS.includes(data.relationship as GuardianRelationship)) errors.push(`relationship must be one of ${RELS.join('/')}`)
        const student = students.find((s) => s.institutionStudentNumber === data.student_number || s.studentNumber === data.student_number)
        if (!student) errors.push(`no student with number "${data.student_number}" in your institution`)
      }
      return { row: idx + 2, data, ok: errors.length === 0, created: false, id: null, errors, warnings }
    })

    return {
      kind, total: rows.length,
      created: 0,
      failed: rows.filter((r) => !r.ok).length,
      warnings: rows.reduce((n, r) => n + r.warnings.length, 0),
      rows,
    }
  },

  /**
   * Commit the valid rows. Each entity is created independently — a failure on
   * one row never corrupts another; the report says exactly what happened.
   */
  async commit(actor: SafeUser, kind: ImportKind, csvText: string): Promise<ImportReport> {
    assertPermission(actor, P.IMPORT_DATA)
    const report = await this.validate(actor, kind, csvText)

    for (const r of report.rows) {
      if (!r.ok) continue
      try {
        const id = await this.createOne(actor, kind, r.data)
        r.created = true
        r.id = id
      } catch (err) {
        r.ok = false
        r.errors.push(err instanceof Error ? err.message : 'create failed')
      }
    }
    report.created = report.rows.filter((r) => r.created).length
    report.failed = report.rows.filter((r) => !r.created).length
    await auditService.record({
      actor, action: 'BULK_IMPORT', targetType: kind, organizationId: actor.organizationId,
      metadata: { kind, total: report.total, created: report.created, failed: report.failed },
    })
    return report
  },

  async createOne(actor: SafeUser, kind: ImportKind, d: Record<string, string>): Promise<Id> {
    if (kind === 'students') {
      const s = await studentService.create(actor, {
        firstName: d.first_name, lastName: d.last_name, middleName: d.middle_name,
        dateOfBirth: d.date_of_birth || undefined, gender: (d.gender as Student['gender']) || undefined,
        nationality: d.nationality || undefined, gradeLevel: d.grade_level, level: d.level as EducationStructureKey,
        studyCode: d.study_code || undefined, program: d.program || undefined,
        guardianName: d.guardian_name || undefined, guardianPhone: d.guardian_phone || undefined,
        guardianEmail: d.guardian_email || undefined, email: d.email || undefined,
        academicYear: d.academic_year || undefined,
      })
      return s.id
    }
    if (kind === 'teachers') {
      const t = await directoryService.createTeacher(actor, {
        firstName: d.first_name, lastName: d.last_name, email: d.email, phone: d.phone ?? '',
        subjects: d.subjects ? d.subjects.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : [],
      })
      return (t as { id: Id }).id
    }
    // guardians
    const student = ((await studentsRepo.list()) as Student[]).find(
      (s) => s.organizationId === actor.organizationId &&
        (s.institutionStudentNumber === d.student_number || s.studentNumber === d.student_number),
    )
    if (!student) throw new Error(`student "${d.student_number}" not found`)
    const res = await guardianService.linkGuardian(actor, {
      studentId: student.id, name: d.name, email: d.email || undefined, phone: d.phone || undefined,
      relationship: d.relationship as GuardianRelationship,
    })
    return res.link.id
  },
}
