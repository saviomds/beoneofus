import { consentsRepo, studentsRepo, organizationsRepo } from '../lib/db'
import { auditService, loadOrgs } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { authorize } from '../lib/authorize'
import { reference } from '../lib/codes'
import { revokeGrantsBy } from '../lib/records'
import { inScope, tenantScope } from '../lib/tenant'
import type { Consent, ConsentEvent, Id, RecordType, SafeUser, Student } from '@shared/types'

const TERMS_VERSION = '2026-01'

function event(actorId: Id, action: string, note: string, status: Consent['status']): ConsentEvent {
  return {
    id: `cev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    at: new Date().toISOString(), actorId, action, note, status,
  }
}

/**
 * The consent ledger. A source institution records that it holds valid consent
 * (or another lawful basis) for releasing a student's records. Records are
 * immutable — withdrawing appends an event and revokes any grants that relied
 * on it, but never deletes history.
 */
export const consentService = {
  async list(actor: SafeUser): Promise<Consent[]> {
    const rows = (await consentsRepo.list()) as Consent[]
    const scope = tenantScope(actor)
    const orgs = await loadOrgs()
    const visible = rows.filter(
      (c) =>
        scope.all ||
        inScope(scope, c.sourceOrganizationId, orgs) ||
        inScope(scope, c.requestingOrganizationId, orgs),
    )
    return visible.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },

  async get(actor: SafeUser, id: Id): Promise<Consent> {
    const c = (await consentsRepo.get(id)) as Consent | null
    if (!c) throw new NotFoundError('Consent')
    const scope = tenantScope(actor)
    const orgs = await loadOrgs()
    if (!scope.all && !inScope(scope, c.sourceOrganizationId, orgs) && !inScope(scope, c.requestingOrganizationId, orgs)) {
      throw new NotFoundError('Consent')
    }
    return c
  },

  /**
   * The source institution records a consent it holds on file for a specific
   * requesting institution and record scope.
   */
  async record(
    actor: SafeUser,
    input: {
      studentId: Id
      requestingOrganizationId: Id
      scopeRecordTypes: RecordType[]
      grantedByName: string
      grantedByRelationship: Consent['grantedByRelationship']
      purpose: string
      legalBasis: string
      requestId?: Id | null
      expiresAt?: string | null
    },
  ): Promise<Consent> {
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    const sourceOrganizationId = student.organizationId

    await authorize(actor, 'MANAGE_CONSENT', {
      kind: 'consent',
      sourceOrganizationId,
      recipientOrganizationId: input.requestingOrganizationId,
    })

    if (!input.grantedByName?.trim()) throw new ValidationError('Record who gave consent.')
    if (!input.scopeRecordTypes?.length) throw new ValidationError('Select at least one record category.')
    const dest = await organizationsRepo.get(input.requestingOrganizationId)
    if (!dest) throw new NotFoundError('Requesting institution')

    const id = await reference(consentsRepo as never, 'CNS')
    const now = new Date().toISOString()
    const consent = (await consentsRepo.create({
      id, studentId: input.studentId, subjectUserId: null,
      grantedByName: input.grantedByName, grantedByRelationship: input.grantedByRelationship,
      requestingOrganizationId: input.requestingOrganizationId, sourceOrganizationId,
      scopeRecordTypes: input.scopeRecordTypes, purpose: input.purpose, legalBasis: input.legalBasis,
      termsVersion: TERMS_VERSION, status: 'GRANTED', requestId: input.requestId ?? null,
      decidedAt: now, expiresAt: input.expiresAt ?? null,
      history: [event(actor.id, 'GRANTED', 'Consent recorded by the holding institution.', 'GRANTED')],
    }, actor.id)) as Consent

    await auditService.record({ actor, action: 'CONSENT_GRANTED', targetId: consent.id, targetType: 'consent', organizationId: sourceOrganizationId, metadata: { studentId: input.studentId, requestingOrganizationId: input.requestingOrganizationId } })
    return consent
  },

  /** Withdraw consent — appends an immutable event and revokes reliant grants. */
  async withdraw(actor: SafeUser, id: Id, note = ''): Promise<Consent> {
    const consent = await this.get(actor, id)
    await authorize(actor, 'MANAGE_CONSENT', { kind: 'consent', sourceOrganizationId: consent.sourceOrganizationId })
    if (['WITHDRAWN', 'REVOKED', 'EXPIRED'].includes(consent.status)) return consent

    const updated = (await consentsRepo.update(id, {
      status: 'WITHDRAWN',
      history: [...consent.history, event(actor.id, 'WITHDRAWN', note || 'Consent withdrawn.', 'WITHDRAWN')],
    }, { actorId: actor.id })) as Consent

    const revoked = await revokeGrantsBy({ consentId: id }, actor.id, 'consent withdrawn')
    await auditService.record({ actor, action: 'CONSENT_WITHDRAWN', targetId: id, targetType: 'consent', organizationId: consent.sourceOrganizationId, metadata: { grantsRevoked: revoked } })
    return updated
  },
}
