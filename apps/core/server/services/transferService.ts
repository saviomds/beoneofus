import { transferRequestsRepo, studentsRepo, organizationsRepo, enrollmentsRepo, usersRepo, recordGrantsRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, auditService, notificationService, loadOrgs, recent } from './_shared'
import { NotFoundError, TenantError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import { RECORD_TYPES } from '@shared/types'
import type { EducationStructureKey, Enrollment, Id, Organization, RecordShareGrant, RequestTimelineEntry, SafeUser, Student, TransferRequest, TransferStatus, User } from '@shared/types'

function entry(actorId: Id, action: string, note: string, status: string): RequestTimelineEntry {
  return { id: `ttl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), actorId, action, note, status: status as never }
}

async function notifyOrg(orgId: Id, title: string, message: string, actionUrl: string) {
  const org = (await organizationsRepo.get(orgId)) as Organization | null
  if (!org) return
  const admins = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === orgId && u.role === 'school')
  for (const a of admins) await notificationService.create({ recipientId: a.id, type: 'transfer', title, message, actionUrl, organizationId: orgId })
}

export const transferService = {
  async list(actor: SafeUser): Promise<{ outgoing: TransferRequest[]; incoming: TransferRequest[]; all: TransferRequest[] }> {
    assertPermission(actor, P.STUDENTS_VIEW)
    const rows = (await transferRequestsRepo.list()) as TransferRequest[]
    if (actor.role === 'admin' || actor.role === 'government') {
      return { outgoing: [], incoming: [], all: recent(rows) }
    }
    const org = actor.organizationId
    return {
      outgoing: recent(rows.filter((r) => r.fromOrganizationId === org)),
      incoming: recent(rows.filter((r) => r.toOrganizationId === org)),
      all: recent(rows.filter((r) => r.fromOrganizationId === org || r.toOrganizationId === org)),
    }
  },

  async initiate(
    actor: SafeUser,
    input: { studentId: Id; toOrganizationId: Id; reason: string; targetLevel: EducationStructureKey; targetAcademicYear: string },
  ): Promise<TransferRequest> {
    assertPermission(actor, P.TRANSFER_INITIATE)
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    assertTenant(actor, student, await loadOrgs())
    const dest = (await organizationsRepo.get(input.toOrganizationId)) as Organization | null
    if (!dest) throw new NotFoundError('Destination institution')
    if (dest.id === student.organizationId) throw new ValidationError('The student already belongs to that institution.')

    const ref = await reference(transferRequestsRepo as never, 'TRF')
    const tr = (await transferRequestsRepo.create({
      id: ref, studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      fromOrganizationId: student.organizationId, toOrganizationId: dest.id, reason: input.reason,
      status: 'INITIATED', initiatedBy: actor.id, approvedBy: null, acceptedBy: null,
      targetLevel: input.targetLevel, targetAcademicYear: input.targetAcademicYear,
      timeline: [entry(actor.id, 'INITIATED', input.reason, 'INITIATED')],
    }, actor.id)) as TransferRequest
    await auditService.record({ actor, action: 'TRANSFER_INITIATED', targetId: tr.id, targetType: 'transfer', organizationId: student.organizationId })
    await notifyOrg(dest.id, 'Incoming transfer request', `${tr.studentName} — pending your acceptance.`, '/school/transfers')
    return tr
  },

  async advance(actor: SafeUser, id: Id, action: 'approve' | 'reject' | 'accept' | 'cancel', note = ''): Promise<TransferRequest> {
    const tr = (await transferRequestsRepo.get(id)) as TransferRequest | null
    if (!tr) throw new NotFoundError('Transfer request')

    const map: Record<string, TransferStatus> = { approve: 'APPROVED', reject: 'REJECTED', accept: 'ACCEPTED', cancel: 'CANCELLED' }
    const status = map[action]

    if (action === 'approve') assertPermission(actor, P.TRANSFER_APPROVE)
    if (action === 'accept') {
      assertPermission(actor, P.TRANSFER_ACCEPT)
      if (actor.organizationId !== tr.toOrganizationId) throw new TenantError('Only the destination institution can accept.')
    }
    if (action === 'cancel' && actor.organizationId !== tr.fromOrganizationId && actor.role !== 'admin') throw new TenantError()

    const patch: Partial<TransferRequest> = {
      status,
      timeline: [...tr.timeline, entry(actor.id, action.toUpperCase(), note, status)],
    }
    if (action === 'approve') patch.approvedBy = actor.id
    if (action === 'accept') patch.acceptedBy = actor.id

    let updated = (await transferRequestsRepo.update(id, patch, { actorId: actor.id })) as TransferRequest

    // On acceptance, actually move the student — retaining ALL history.
    if (action === 'accept') {
      const student = (await studentsRepo.get(tr.studentId)) as Student
      const enrollments = (await enrollmentsRepo.list({ studentId: student.id })) as Enrollment[]
      for (const e of enrollments) {
        if (e.status === 'ACTIVE') {
          await enrollmentsRepo.update(e.id, { status: 'TRANSFERRED', endDate: new Date().toISOString().slice(0, 10), note: `Transferred to ${tr.toOrganizationId}` }, { actorId: actor.id })
        }
      }
      const seq = enrollments.length + 1
      await enrollmentsRepo.create({
        id: `ENR-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`, studentId: student.id,
        organizationId: tr.toOrganizationId, academicYear: tr.targetAcademicYear, level: tr.targetLevel,
        gradeLevel: student.gradeLevel, classId: null, studyCode: student.studyCode, status: 'ACTIVE',
        startDate: new Date().toISOString().slice(0, 10), endDate: null, note: `Transferred in (${tr.id})`,
      }, actor.id)
      await studentsRepo.update(student.id, { organizationId: tr.toOrganizationId, schoolId: tr.toOrganizationId, classId: null, teacherId: null, mentorId: null }, { actorId: actor.id })
      await usersRepo.update(student.userId, { organizationId: tr.toOrganizationId }, { actorId: actor.id })

      // The receiving institution gets scoped, revocable read access to the
      // records the origin still holds (which keep their original organizationId).
      // Records are never copied — the source remains the system of record.
      const grant = (await recordGrantsRepo.create({
        studentId: student.id, sourceOrganizationId: tr.fromOrganizationId, recipientOrganizationId: tr.toOrganizationId,
        recordTypes: RECORD_TYPES, reason: 'STUDENT_TRANSFER', requestId: null, transferId: tr.id, consentId: null,
        grantedBy: actor.id, grantedAt: new Date().toISOString(), expiresAt: null, revokedAt: null, revokedBy: null,
        status: 'ACTIVE',
      }, actor.id)) as RecordShareGrant
      await auditService.record({ actor, action: 'RECORD_GRANT_CREATED', targetId: grant.id, targetType: 'recordGrant', organizationId: tr.fromOrganizationId, metadata: { studentId: student.id, reason: 'STUDENT_TRANSFER', transferId: tr.id } })

      updated = (await transferRequestsRepo.update(id, { status: 'COMPLETED', timeline: [...updated.timeline, entry(actor.id, 'COMPLETED', 'Student record moved; history retained; academic records shared with receiver.', 'COMPLETED')] }, { actorId: actor.id })) as TransferRequest
      await notifyOrg(tr.fromOrganizationId, 'Transfer completed', `${tr.studentName} has been transferred out. Their academic history is now shared with the receiving institution.`, '/school/transfers')
    }

    await auditService.record({ actor, action: `TRANSFER_${action.toUpperCase()}`, targetId: id, targetType: 'transfer', metadata: { note } })
    await notifyOrg(action === 'accept' ? tr.fromOrganizationId : tr.toOrganizationId, `Transfer ${status.toLowerCase()}`, `${tr.studentName} — ${note || tr.id}`, '/school/transfers')
    return updated
  },

  async destinations(actor: SafeUser): Promise<{ id: Id; name: string }[]> {
    const orgs = (await organizationsRepo.list()) as Organization[]
    return orgs
      .filter((o) => o.status === 'ACTIVE' && o.id !== actor.organizationId && o.organizationType !== 'GOVERNMENT_INSTITUTION')
      .map((o) => ({ id: o.id, name: o.officialName }))
  },
}
