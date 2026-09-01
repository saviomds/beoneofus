// ---------------------------------------------------------------------------
// Inter-institution record access.
//
// A student's records always live with the institution that created them
// (`organizationId` = source). Another institution can read them ONLY through
// an ACTIVE RecordShareGrant — produced by an approved RecordRequest or by an
// accepted student transfer. Grants are scoped to specific RecordTypes, are
// revocable, and may expire.
// ---------------------------------------------------------------------------

import { recordGrantsRepo, guardianLinksRepo, enrollmentsRepo } from './db'
import type { Enrollment, GuardianLink, Id, RecordShareGrant, RecordType, SafeUser, Student } from '@shared/types'
import { TenantError } from './errors'

/** Lazily flip grants whose expiry has passed to EXPIRED (write-through). */
async function sweepExpired(grants: RecordShareGrant[]): Promise<RecordShareGrant[]> {
  const now = Date.now()
  const out: RecordShareGrant[] = []
  for (const g of grants) {
    if (g.status === 'ACTIVE' && g.expiresAt && new Date(g.expiresAt).getTime() < now) {
      out.push((await recordGrantsRepo.update(g.id, { status: 'EXPIRED' }, { actorId: 'system' })) as RecordShareGrant)
    } else {
      out.push(g)
    }
  }
  return out
}

export async function activeGrantsFor(studentId: Id, recipientOrganizationId: Id): Promise<RecordShareGrant[]> {
  const all = (await recordGrantsRepo.list({ studentId })) as RecordShareGrant[]
  const swept = await sweepExpired(all)
  return swept.filter(
    (g) => g.recipientOrganizationId === recipientOrganizationId && g.status === 'ACTIVE',
  )
}

/** Does `recipientOrganizationId` currently hold read access to this record type? */
export async function hasGrant(
  recipientOrganizationId: Id | null | undefined,
  studentId: Id,
  recordType: RecordType,
): Promise<boolean> {
  if (!recipientOrganizationId) return false
  const grants = await activeGrantsFor(studentId, recipientOrganizationId)
  return grants.some((g) => g.recordTypes.includes(recordType))
}

export interface RecordAccess {
  /** own = same tenant; grant = inter-institution share; guardian = linked
   *  guardian; former = an institution the student previously attended */
  mode: 'own' | 'grant' | 'guardian' | 'former'
  /** when set, readers must filter returned rows to this organizationId */
  scopeOrgId?: Id
}

export async function activeGuardianLink(guardianUserId: Id, studentId: Id): Promise<GuardianLink | null> {
  const links = (await guardianLinksRepo.list({ guardianUserId })) as GuardianLink[]
  return links.find((l) => l.studentId === studentId && l.status === 'active') ?? null
}

/**
 * Read gate for a specific student record type. Passes when the caller is:
 *  - in the student's own institution / admin;
 *  - an institution holding an active RecordShareGrant for that type;
 *  - a linked guardian whose link covers that type;
 *  - an institution the student previously attended (scoped to its own rows).
 * Students reading their own records are handled by the caller before this.
 */
export async function assertRecordAccess(
  actor: SafeUser,
  student: Student,
  recordType: RecordType,
): Promise<RecordAccess> {
  if (actor.role === 'admin') return { mode: 'own' }
  if (actor.organizationId && actor.organizationId === student.organizationId) {
    return { mode: 'own' }
  }

  if (actor.role === 'guardian') {
    const link = await activeGuardianLink(actor.id, student.id)
    if (link && link.canViewRecordTypes.includes(recordType)) return { mode: 'guardian' }
    throw new TenantError('You are not a verified guardian for this student, or this record type is not shared with you.')
  }

  if (await hasGrant(actor.organizationId, student.id, recordType)) {
    return { mode: 'grant' }
  }

  // an institution the student previously attended keeps read access to the
  // records IT created (its own organizationId), never the current school's.
  if (actor.organizationId) {
    const priorEnrollment = ((await enrollmentsRepo.list({ studentId: student.id })) as Enrollment[]).some(
      (e) => e.organizationId === actor.organizationId,
    )
    if (priorEnrollment) return { mode: 'former', scopeOrgId: actor.organizationId }
  }

  throw new TenantError('No active record-sharing grant covers this data.')
}

/** Revoke every active grant tied to a request or consent (used on withdrawal). */
export async function revokeGrantsBy(
  filter: { requestId?: Id; consentId?: Id },
  actorId: Id,
  reason: string,
): Promise<number> {
  const all = (await recordGrantsRepo.list()) as RecordShareGrant[]
  const hit = all.filter(
    (g) =>
      g.status === 'ACTIVE' &&
      ((filter.requestId && g.requestId === filter.requestId) ||
        (filter.consentId && g.consentId === filter.consentId)),
  )
  for (const g of hit) {
    await recordGrantsRepo.update(
      g.id,
      { status: 'REVOKED', revokedAt: new Date().toISOString(), revokedBy: actorId },
      { actorId },
    )
  }
  void reason
  return hit.length
}
