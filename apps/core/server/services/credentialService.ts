import { credentialsRepo, studentsRepo, organizationsRepo } from '../lib/db'
import { auditService, notificationService, loadOrgs, scopeRows } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { authorize } from '../lib/authorize'
import { assertTenant } from '../lib/tenant'
import type { Credential, Id, Organization, SafeUser, Student } from '@shared/types'

function makeVerificationCode(): string {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BOU-CRD-${seg()}-${seg()}`
}

/** The only fields a public, unauthenticated verifier may see. No PII beyond the holder's name. */
export interface PublicCredentialResult {
  valid: boolean
  status?: Credential['status']
  credentialTitle?: string
  credentialType?: Credential['type']
  holderName?: string
  issuerName?: string
  issuedDate?: string
  verificationCode?: string
}

export const credentialService = {
  /** Credentials issued by the caller's institution. */
  async listForOrg(actor: SafeUser): Promise<Credential[]> {
    await authorize(actor, 'READ', { kind: 'credential', organizationId: actor.organizationId })
    const rows = scopeRows(actor, (await credentialsRepo.list()) as Credential[], await loadOrgs())
    return rows.sort((a, b) => (a.issuedDate < b.issuedDate ? 1 : -1))
  },

  async issue(
    actor: SafeUser,
    input: { studentId: Id; title: string; type: Credential['type']; issuedDate?: string },
  ): Promise<Credential> {
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    await authorize(actor, 'ISSUE_CREDENTIAL', { kind: 'credential', organizationId: student.organizationId })
    assertTenant(actor, student, await loadOrgs())
    if (!input.title?.trim()) throw new ValidationError('A credential title is required.')

    const org = (await organizationsRepo.get(student.organizationId)) as Organization | null
    let code = makeVerificationCode()
    const existing = (await credentialsRepo.list()) as Credential[]
    while (existing.some((c) => c.verificationCode === code)) code = makeVerificationCode()

    const credential = (await credentialsRepo.create({
      studentId: student.id, organizationId: student.organizationId,
      title: input.title.trim(), issuer: org?.officialName ?? 'Institution',
      issuedDate: input.issuedDate || new Date().toISOString().slice(0, 10),
      type: input.type, verificationCode: code, status: 'issued',
    }, actor.id)) as Credential

    await auditService.record({ actor, action: 'CREDENTIAL_ISSUED', targetId: credential.id, targetType: 'credential', organizationId: student.organizationId, metadata: { studentId: student.id, verificationCode: code } })
    await notificationService.create({ recipientId: student.userId, type: 'system', title: 'Credential issued', message: `${credential.title} — verifiable with code ${code}.`, actionUrl: '/student/credentials', organizationId: student.organizationId })
    return credential
  },

  async revoke(actor: SafeUser, id: Id, reason = ''): Promise<Credential> {
    const credential = (await credentialsRepo.get(id)) as Credential | null
    if (!credential) throw new NotFoundError('Credential')
    await authorize(actor, 'REVOKE_CREDENTIAL', { kind: 'credential', organizationId: credential.organizationId })
    assertTenant(actor, credential, await loadOrgs())
    const updated = (await credentialsRepo.update(id, { status: 'revoked' }, { actorId: actor.id })) as Credential
    await auditService.record({ actor, action: 'CREDENTIAL_REVOKED', targetId: id, targetType: 'credential', organizationId: credential.organizationId, metadata: { reason } })
    return updated
  },

  /**
   * PUBLIC — no authentication. Returns only what is needed to confirm a
   * credential is genuine and whose it is. Never exposes grades, contact
   * details, documents, guardians or any other student data.
   */
  async verifyPublic(code: string): Promise<PublicCredentialResult> {
    const clean = (code ?? '').trim()
    if (!clean) return { valid: false }
    const credential = ((await credentialsRepo.list()) as Credential[]).find(
      (c) => c.verificationCode.toUpperCase() === clean.toUpperCase(),
    )
    if (!credential) return { valid: false }

    const student = (await studentsRepo.get(credential.studentId)) as Student | null
    const org = (await organizationsRepo.get(credential.organizationId)) as Organization | null

    return {
      valid: credential.status === 'issued',
      status: credential.status,
      credentialTitle: credential.title,
      credentialType: credential.type,
      holderName: student ? `${student.firstName} ${student.lastName}` : undefined,
      issuerName: org?.officialName ?? credential.issuer,
      issuedDate: credential.issuedDate,
      verificationCode: credential.verificationCode,
    }
  },
}
