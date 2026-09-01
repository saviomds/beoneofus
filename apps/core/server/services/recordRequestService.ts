import {
  recordRequestsRepo, recordGrantsRepo, consentsRepo, studentsRepo, organizationsRepo, enrollmentsRepo, usersRepo,
} from '../lib/db'
import { auditService, notificationService, loadOrgs } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { authorize } from '../lib/authorize'
import { reference } from '../lib/codes'
import { revokeGrantsBy } from '../lib/records'
import { inScope, tenantScope } from '../lib/tenant'
import type {
  Consent, Enrollment, Id, Organization, RecordRequest, RecordShareGrant, RecordType,
  RequestTimelineEntry, SafeUser, Student, User,
} from '@shared/types'

const DEFAULT_GRANT_DAYS = 90

function entry(actorId: Id, action: string, note: string, status: RecordRequest['status']): RequestTimelineEntry {
  return {
    id: `rtl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    at: new Date().toISOString(), actorId, action, note, status: status as never,
  }
}

async function notifyOrgAdmins(orgId: Id, title: string, message: string) {
  const admins = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === orgId && u.role === 'school')
  for (const a of admins) {
    await notificationService.create({ recipientId: a.id, type: 'request', title, message, actionUrl: '/school/record-requests', organizationId: orgId })
  }
}

/** Was this student ever enrolled at `orgId` (currently, or historically)? */
async function studentBelongedTo(student: Student, orgId: Id): Promise<boolean> {
  if (student.organizationId === orgId) return true
  const enrollments = (await enrollmentsRepo.list({ studentId: student.id })) as Enrollment[]
  return enrollments.some((e) => e.organizationId === orgId)
}

export const recordRequestService = {
  async list(actor: SafeUser): Promise<{ outgoing: RecordRequest[]; incoming: RecordRequest[]; all: RecordRequest[] }> {
    const rows = (await recordRequestsRepo.list()) as RecordRequest[]
    const scope = tenantScope(actor)
    const orgs = await loadOrgs()
    if (scope.all || actor.role === 'government') {
      const visible = rows.filter((r) => scope.all || inScope(scope, r.sourceOrganizationId, orgs) || inScope(scope, r.requestingOrganizationId, orgs))
      return { outgoing: [], incoming: [], all: sort(visible) }
    }
    const org = actor.organizationId
    return {
      outgoing: sort(rows.filter((r) => r.requestingOrganizationId === org)),
      incoming: sort(rows.filter((r) => r.sourceOrganizationId === org)),
      all: sort(rows.filter((r) => r.requestingOrganizationId === org || r.sourceOrganizationId === org)),
    }
  },

  async get(actor: SafeUser, id: Id): Promise<RecordRequest> {
    const r = (await recordRequestsRepo.get(id)) as RecordRequest | null
    if (!r) throw new NotFoundError('Record request')
    if (
      actor.role !== 'admin' && actor.role !== 'government' &&
      actor.organizationId !== r.sourceOrganizationId &&
      actor.organizationId !== r.requestingOrganizationId
    ) {
      throw new NotFoundError('Record request')
    }
    return r
  },

  /** The requesting institution raises a request. No record data is exposed here. */
  async create(
    actor: SafeUser,
    input: {
      studentId: Id
      sourceOrganizationId: Id
      requestedRecordTypes: RecordType[]
      purpose: string
      legalBasis: string
    },
  ): Promise<RecordRequest> {
    const requestingOrganizationId = actor.organizationId
    await authorize(actor, 'REQUEST_RECORDS', { kind: 'recordRequest', recipientOrganizationId: requestingOrganizationId })
    if (!requestingOrganizationId) throw new ValidationError('This account is not attached to an institution.')

    const source = (await organizationsRepo.get(input.sourceOrganizationId)) as Organization | null
    if (!source) throw new NotFoundError('Source institution')
    if (source.id === requestingOrganizationId) throw new ValidationError('That is your own institution.')
    if (!input.requestedRecordTypes?.length) throw new ValidationError('Select at least one record category.')
    if (!input.purpose?.trim()) throw new ValidationError('State the purpose of the request.')

    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student || !(await studentBelongedTo(student, input.sourceOrganizationId))) {
      throw new NotFoundError('No record of that student at that institution')
    }

    const id = await reference(recordRequestsRepo as never, 'RRQ')
    const request = (await recordRequestsRepo.create({
      id, reference: id, studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      sourceOrganizationId: input.sourceOrganizationId, requestingOrganizationId,
      requestedBy: actor.id, requestedRecordTypes: input.requestedRecordTypes, approvedRecordTypes: [],
      purpose: input.purpose, legalBasis: input.legalBasis ?? '', consentId: null,
      status: 'SUBMITTED', reviewedBy: null, reviewedAt: null, decisionNote: '', grantId: null, expiresAt: null,
      timeline: [entry(actor.id, 'SUBMITTED', input.purpose, 'SUBMITTED')],
    }, actor.id)) as RecordRequest

    await auditService.record({ actor, action: 'RECORD_REQUEST_CREATED', targetId: id, targetType: 'recordRequest', organizationId: requestingOrganizationId, metadata: { sourceOrganizationId: input.sourceOrganizationId, studentId: student.id, types: input.requestedRecordTypes } })
    await notifyOrgAdmins(input.sourceOrganizationId, 'Incoming records request', `${request.studentName} — records requested for review.`)
    return request
  },

  /**
   * The source institution reviews. `approve` / `partial` require a lawful
   * basis: either a recorded Consent for this student + requester, or an
   * explicit written legal basis. On approval a scoped, time-limited,
   * revocable RecordShareGrant is created.
   */
  async review(
    actor: SafeUser,
    id: Id,
    decision: 'approve' | 'partial' | 'reject' | 'need_info',
    input: {
      approvedRecordTypes?: RecordType[]
      consentId?: Id | null
      legalBasis?: string
      note?: string
      expiresInDays?: number
    } = {},
  ): Promise<RecordRequest> {
    const request = await this.get(actor, id)
    await authorize(actor, 'APPROVE_RECORD_REQUEST', { kind: 'recordRequest', sourceOrganizationId: request.sourceOrganizationId })
    if (!['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(request.status)) {
      throw new ValidationError(`This request is ${request.status.toLowerCase()} and can no longer be reviewed.`)
    }
    const note = input.note ?? ''

    if (decision === 'reject') {
      return this.transition(actor, request, 'REJECTED', 'REJECT', note || 'Request rejected.')
    }
    if (decision === 'need_info') {
      return this.transition(actor, request, 'MORE_INFORMATION_REQUIRED', 'NEED_INFO', note || 'More information required.')
    }

    // approve / partial — verify lawful basis
    let consent: Consent | null = null
    if (input.consentId) {
      consent = (await consentsRepo.get(input.consentId)) as Consent | null
      if (!consent || consent.sourceOrganizationId !== request.sourceOrganizationId || consent.studentId !== request.studentId) {
        throw new ValidationError('That consent record does not match this request.')
      }
      if (consent.status !== 'GRANTED') throw new ValidationError(`The linked consent is ${consent.status.toLowerCase()}.`)
    }
    const legalBasis = input.legalBasis?.trim() || consent?.legalBasis || ''
    if (!consent && !legalBasis) {
      throw new ValidationError('Approval needs a lawful basis: link a consent record or state the legal basis.')
    }

    const requested = new Set(request.requestedRecordTypes)
    let approvedTypes = (input.approvedRecordTypes?.length ? input.approvedRecordTypes : request.requestedRecordTypes)
      .filter((t) => requested.has(t))
    if (consent) approvedTypes = approvedTypes.filter((t) => consent!.scopeRecordTypes.includes(t))
    if (!approvedTypes.length) throw new ValidationError('No record categories were approved.')

    const partial = approvedTypes.length < request.requestedRecordTypes.length
    const days = Number.isFinite(input.expiresInDays) ? Number(input.expiresInDays) : DEFAULT_GRANT_DAYS
    const expiresAt = new Date(Date.now() + days * 86400_000).toISOString()

    const grant = (await recordGrantsRepo.create({
      studentId: request.studentId, sourceOrganizationId: request.sourceOrganizationId,
      recipientOrganizationId: request.requestingOrganizationId, recordTypes: approvedTypes,
      reason: 'RECORDS_REQUEST', requestId: request.id, transferId: null, consentId: consent?.id ?? null,
      grantedBy: actor.id, grantedAt: new Date().toISOString(), expiresAt, revokedAt: null, revokedBy: null,
      status: 'ACTIVE',
    }, actor.id)) as RecordShareGrant

    const status: RecordRequest['status'] = partial ? 'PARTIALLY_APPROVED' : 'APPROVED'
    const updated = (await recordRequestsRepo.update(id, {
      status, approvedRecordTypes: approvedTypes, consentId: consent?.id ?? null,
      reviewedBy: actor.id, reviewedAt: new Date().toISOString(),
      decisionNote: note, grantId: grant.id, expiresAt,
      timeline: [...request.timeline, entry(actor.id, partial ? 'PARTIALLY_APPROVED' : 'APPROVED', note || `Granted ${approvedTypes.join(', ')} until ${expiresAt.slice(0, 10)}.`, status)],
    }, { actorId: actor.id })) as RecordRequest

    await auditService.record({ actor, action: 'RECORD_REQUEST_APPROVED', targetId: id, targetType: 'recordRequest', organizationId: request.sourceOrganizationId, metadata: { grantId: grant.id, approvedTypes, consentId: consent?.id ?? null, legalBasis, expiresAt } })
    await notifyOrgAdmins(request.requestingOrganizationId, 'Records request approved', `${request.studentName} — read access granted until ${expiresAt.slice(0, 10)}.`)
    return updated
  },

  /** The source institution revokes an approved request's grant early. */
  async revoke(actor: SafeUser, id: Id, note = ''): Promise<RecordRequest> {
    const request = await this.get(actor, id)
    await authorize(actor, 'APPROVE_RECORD_REQUEST', { kind: 'recordRequest', sourceOrganizationId: request.sourceOrganizationId })
    if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(request.status)) {
      throw new ValidationError('Only an approved request can be revoked.')
    }
    const count = await revokeGrantsBy({ requestId: id }, actor.id, note || 'revoked by source institution')
    const updated = (await recordRequestsRepo.update(id, {
      status: 'REVOKED',
      timeline: [...request.timeline, entry(actor.id, 'REVOKED', note || 'Access revoked by the holding institution.', 'REVOKED')],
    }, { actorId: actor.id })) as RecordRequest
    await auditService.record({ actor, action: 'RECORD_REQUEST_REVOKED', targetId: id, targetType: 'recordRequest', organizationId: request.sourceOrganizationId, metadata: { grantsRevoked: count } })
    await notifyOrgAdmins(request.requestingOrganizationId, 'Records access revoked', `${request.studentName} — the holding institution revoked access.`)
    return updated
  },

  async transition(actor: SafeUser, request: RecordRequest, status: RecordRequest['status'], action: string, note: string): Promise<RecordRequest> {
    const updated = (await recordRequestsRepo.update(request.id, {
      status, reviewedBy: actor.id, reviewedAt: new Date().toISOString(), decisionNote: note,
      timeline: [...request.timeline, entry(actor.id, action, note, status)],
    }, { actorId: actor.id })) as RecordRequest
    await auditService.record({ actor, action: `RECORD_REQUEST_${action}`, targetId: request.id, targetType: 'recordRequest', organizationId: request.sourceOrganizationId, metadata: { note } })
    await notifyOrgAdmins(request.requestingOrganizationId, `Records request ${status.toLowerCase().replace(/_/g, ' ')}`, `${request.studentName} — ${note}`)
    return updated
  },

  /** Institutions the caller could request records from. */
  async sources(actor: SafeUser): Promise<{ id: Id; name: string }[]> {
    const orgs = (await organizationsRepo.list()) as Organization[]
    return orgs
      .filter((o) => o.status === 'ACTIVE' && o.id !== actor.organizationId && o.organizationType !== 'GOVERNMENT_INSTITUTION')
      .map((o) => ({ id: o.id, name: o.officialName }))
  },
}

function sort<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
