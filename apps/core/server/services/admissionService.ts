import { applicationsRepo, studentsRepo } from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService,
  loadOrgs, actingOrgId, recent,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import { studentService } from './studentService'
import type {
  Application, ApplicationStatus, ApplicationTimelineEntry, EducationStructureKey, Id, SafeUser, Student,
} from '@shared/types'

function entry(actorId: Id, action: string, note: string, status: ApplicationStatus): ApplicationTimelineEntry {
  return { id: `atl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), actorId, action, note, status }
}

const REVIEWABLE: ApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'WAITLISTED']

async function requireApp(actor: SafeUser, id: Id): Promise<Application> {
  const app = (await applicationsRepo.get(id)) as Application | null
  if (!app) throw new NotFoundError('Application')
  assertTenant(actor, app, await loadOrgs())
  return app
}

export const admissionService = {
  async list(actor: SafeUser, q: { status?: ApplicationStatus; intakeYear?: string } = {}): Promise<Application[]> {
    assertPermission(actor, P.ADMISSIONS_VIEW)
    let rows = scopeRows(actor, (await applicationsRepo.list()) as Application[], await loadOrgs())
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.intakeYear) rows = rows.filter((r) => r.intakeYear === q.intakeYear)
    return recent(rows)
  },

  async get(actor: SafeUser, id: Id): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_VIEW)
    return requireApp(actor, id)
  },

  async create(
    actor: SafeUser,
    input: {
      applicantFirstName: string; applicantLastName: string; dateOfBirth?: string
      gender?: Application['gender']; nationality?: string
      guardianName?: string; guardianPhone?: string; guardianEmail?: string
      priorSchool?: string; gradeApplyingFor: string; level: EducationStructureKey
      studyCode?: string; intakeYear?: string; notes?: string; submit?: boolean
    },
  ): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    const organizationId = actingOrgId(actor)
    if (!input.applicantFirstName?.trim() || !input.applicantLastName?.trim()) throw new ValidationError('Applicant name is required.')
    if (!input.gradeApplyingFor?.trim()) throw new ValidationError('State the grade applied for.')

    const id = await reference(applicationsRepo as never, 'APP')
    const status: ApplicationStatus = input.submit ? 'SUBMITTED' : 'DRAFT'
    const app = (await applicationsRepo.create({
      id, reference: id, organizationId,
      applicantFirstName: input.applicantFirstName.trim(), applicantLastName: input.applicantLastName.trim(),
      dateOfBirth: input.dateOfBirth || '2012-01-01', gender: input.gender ?? 'other', nationality: input.nationality ?? 'Rwandan',
      guardianName: input.guardianName ?? '', guardianPhone: input.guardianPhone ?? '', guardianEmail: input.guardianEmail ?? '',
      priorSchool: input.priorSchool ?? '', gradeApplyingFor: input.gradeApplyingFor, level: input.level,
      studyCode: input.studyCode ?? '', intakeYear: input.intakeYear ?? String(new Date().getFullYear() + 1),
      notes: input.notes ?? '', status, assessmentScore: null, decisionNote: '', offerExpiresAt: null,
      studentId: null, submittedBy: actor.id, reviewedBy: null,
      timeline: [entry(actor.id, status, input.notes ?? '', status)],
    }, actor.id)) as Application
    await auditService.record({ actor, action: 'APPLICATION_CREATED', targetId: id, targetType: 'application', organizationId, metadata: { status } })
    return app
  },

  async submit(actor: SafeUser, id: Id): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    const app = await requireApp(actor, id)
    if (app.status !== 'DRAFT') throw new ValidationError('Only a draft application can be submitted.')
    return this.transition(actor, app, 'SUBMITTED', 'SUBMITTED', 'Application submitted.')
  },

  async review(
    actor: SafeUser,
    id: Id,
    decision: 'shortlist' | 'offer' | 'reject' | 'waitlist' | 'start_review',
    input: { note?: string; assessmentScore?: number; offerDays?: number } = {},
  ): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    const app = await requireApp(actor, id)
    if (!REVIEWABLE.includes(app.status)) throw new ValidationError(`An application that is ${app.status.toLowerCase()} cannot be reviewed.`)
    const note = input.note ?? ''
    const patch: Partial<Application> = { reviewedBy: actor.id }
    if (input.assessmentScore !== undefined) patch.assessmentScore = input.assessmentScore

    const map: Record<typeof decision, ApplicationStatus> = {
      start_review: 'UNDER_REVIEW', shortlist: 'SHORTLISTED', offer: 'OFFERED', reject: 'REJECTED', waitlist: 'WAITLISTED',
    }
    const status = map[decision]
    if (decision === 'offer') {
      patch.offerExpiresAt = new Date(Date.now() + (input.offerDays ?? 14) * 86400_000).toISOString()
    }
    Object.assign(patch, { status, decisionNote: note, timeline: [...app.timeline, entry(actor.id, decision.toUpperCase(), note, status)] })
    const updated = (await applicationsRepo.update(id, patch, { actorId: actor.id })) as Application
    await auditService.record({ actor, action: `APPLICATION_${decision.toUpperCase()}`, targetId: id, targetType: 'application', organizationId: app.organizationId })
    return updated
  },

  async acceptOffer(actor: SafeUser, id: Id, note = ''): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    const app = await requireApp(actor, id)
    if (app.status !== 'OFFERED') throw new ValidationError('There is no open offer on this application.')
    if (app.offerExpiresAt && new Date(app.offerExpiresAt).getTime() < Date.now()) throw new ValidationError('The offer has expired.')
    return this.transition(actor, app, 'OFFER_ACCEPTED', 'OFFER_ACCEPTED', note || 'Offer accepted.')
  },

  async withdraw(actor: SafeUser, id: Id, note = ''): Promise<Application> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    const app = await requireApp(actor, id)
    if (app.status === 'ENROLLED') throw new ValidationError('An enrolled application cannot be withdrawn.')
    return this.transition(actor, app, 'WITHDRAWN', 'WITHDRAWN', note || 'Application withdrawn.')
  },

  /**
   * Convert an accepted application into a real enrolment. Creates the Student +
   * User + initial enrollment exactly once (guarded by `application.studentId`).
   */
  async enroll(
    actor: SafeUser,
    id: Id,
    input: { classId?: Id | null; academicYear?: string; email?: string } = {},
  ): Promise<{ application: Application; student: Student }> {
    assertPermission(actor, P.ADMISSIONS_MANAGE)
    assertPermission(actor, P.STUDENTS_CREATE)
    const app = await requireApp(actor, id)
    if (app.studentId) {
      const existing = (await studentsRepo.get(app.studentId)) as Student
      return { application: app, student: existing }
    }
    if (app.status !== 'OFFER_ACCEPTED' && app.status !== 'SHORTLISTED' && app.status !== 'OFFERED') {
      throw new ValidationError('Only an accepted / offered application can be enrolled.')
    }

    const student = await studentService.create(actor, {
      firstName: app.applicantFirstName, lastName: app.applicantLastName, dateOfBirth: app.dateOfBirth,
      gender: app.gender, nationality: app.nationality, gradeLevel: app.gradeApplyingFor,
      classId: input.classId ?? null, studyCode: app.studyCode, level: app.level,
      guardianName: app.guardianName, guardianPhone: app.guardianPhone, guardianEmail: app.guardianEmail,
      email: input.email ?? app.guardianEmail, academicYear: input.academicYear ?? app.intakeYear,
    })

    const updated = (await applicationsRepo.update(id, {
      status: 'ENROLLED', studentId: student.id,
      timeline: [...app.timeline, entry(actor.id, 'ENROLLED', `Enrolled as ${student.id}`, 'ENROLLED')],
    }, { actorId: actor.id })) as Application
    await auditService.record({ actor, action: 'APPLICATION_ENROLLED', targetId: id, targetType: 'application', organizationId: app.organizationId, metadata: { studentId: student.id } })
    return { application: updated, student }
  },

  async transition(actor: SafeUser, app: Application, status: ApplicationStatus, action: string, note: string): Promise<Application> {
    const updated = (await applicationsRepo.update(app.id, {
      status, timeline: [...app.timeline, entry(actor.id, action, note, status)],
    }, { actorId: actor.id })) as Application
    await auditService.record({ actor, action: `APPLICATION_${action}`, targetId: app.id, targetType: 'application', organizationId: app.organizationId })
    return updated
  },
}
