import { requestsRepo, usersRepo, organizationsRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService, notificationService, recent } from './_shared'
import { NotFoundError, TenantError } from '../lib/errors'
import { reference } from '../lib/codes'
import type { GovRequest, Id, Organization, RequestStatus, RequestTimelineEntry, SafeUser, User } from '@shared/types'

function entry(actorId: Id, action: string, note: string, status: RequestStatus): RequestTimelineEntry {
  return { id: `rtl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), actorId, action, note, status }
}

async function governmentRecipients(): Promise<User[]> {
  return ((await usersRepo.list()) as User[]).filter((u) => u.role === 'government')
}
async function institutionRecipients(orgId: Id): Promise<User[]> {
  return ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === orgId && u.role === 'school')
}

export const requestService = {
  async list(actor: SafeUser, q: { status?: RequestStatus; officerId?: Id } = {}) {
    assertPermission(actor, P.REQUESTS_VIEW)
    let rows = (await requestsRepo.list()) as GovRequest[]
    if (actor.role === 'school') rows = rows.filter((r) => r.organizationId === actor.organizationId)
    else if (actor.role === 'government') {
      // government sees requests from institutions in its jurisdiction
      const orgs = (await organizationsRepo.list()) as Organization[]
      const g = actor.govScope
      if (g && g.level !== 'NATIONAL') {
        const allowed = new Set(orgs.filter((o) => g.level === 'REGIONAL' ? (g.provinces ?? []).includes(o.province) : (g.districts ?? []).includes(o.district)).map((o) => o.id))
        rows = rows.filter((r) => allowed.has(r.organizationId))
      }
    } else if (actor.role !== 'admin') {
      rows = rows.filter((r) => r.organizationId === actor.organizationId)
    }
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.officerId) rows = rows.filter((r) => r.assignedOfficerId === q.officerId)
    return recent(rows)
  },

  async get(actor: SafeUser, id: Id): Promise<GovRequest> {
    assertPermission(actor, P.REQUESTS_VIEW)
    const req = (await requestsRepo.get(id)) as GovRequest | null
    if (!req) throw new NotFoundError('Request')
    if (actor.role === 'school' && req.organizationId !== actor.organizationId) throw new TenantError()
    return req
  },

  async create(
    actor: SafeUser,
    input: Pick<GovRequest, 'type' | 'title' | 'description' | 'priority' | 'governmentDepartment'> & Partial<Pick<GovRequest, 'attachments'>>,
  ): Promise<GovRequest> {
    assertPermission(actor, P.REQUESTS_CREATE)
    if (!actor.organizationId) throw new TenantError('Only an institution account can raise a request.')
    const gov = ((await organizationsRepo.list()) as Organization[]).find((o) => o.organizationType === 'GOVERNMENT_INSTITUTION') ?? null
    const ref = await reference(requestsRepo as never, 'REQ')
    const now = new Date().toISOString()
    const request = (await requestsRepo.create({
      reference: ref, schoolId: actor.organizationId, organizationId: actor.organizationId,
      governmentId: gov?.id ?? null, governmentDepartment: input.governmentDepartment, type: input.type,
      title: input.title, description: input.description, attachments: input.attachments ?? [],
      priority: input.priority, status: 'submitted', submittedAt: now, assignedOfficerId: null,
      response: '', timeline: [entry(actor.id, 'SUBMITTED', 'Request submitted.', 'submitted')],
    }, actor.id)) as GovRequest
    await auditService.record({ actor, action: 'REQUEST_SUBMITTED', targetId: request.id, targetType: 'request', organizationId: actor.organizationId, metadata: { reference: ref } })
    for (const u of await governmentRecipients()) {
      await notificationService.create({ recipientId: u.id, type: 'request', title: 'New school request', message: `${ref} — ${request.title}`, actionUrl: '/government/requests' })
    }
    return request
  },

  async advance(
    actor: SafeUser, id: Id,
    action: 'received' | 'assign' | 'under_review' | 'need_information' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
    note: string, extra?: { officerId?: Id; response?: string },
  ): Promise<GovRequest> {
    const req = (await requestsRepo.get(id)) as GovRequest | null
    if (!req) throw new NotFoundError('Request')
    const isSchoolCancel = action === 'cancelled' && actor.role === 'school' && req.organizationId === actor.organizationId
    if (!isSchoolCancel) assertPermission(actor, P.REQUESTS_PROCESS)

    const statusMap: Record<string, RequestStatus> = {
      received: 'received', assign: 'under_review', under_review: 'under_review', need_information: 'need_information',
      approved: 'approved', rejected: 'rejected', in_progress: 'in_progress', completed: 'completed', cancelled: 'cancelled',
    }
    const status = statusMap[action]
    const patch: Partial<GovRequest> = { status, timeline: [...req.timeline, entry(actor.id, action.toUpperCase(), note, status)] }
    if (action === 'assign' && extra?.officerId) patch.assignedOfficerId = extra.officerId
    if (extra?.response !== undefined) patch.response = extra.response
    const updated = (await requestsRepo.update(id, patch, { actorId: actor.id })) as GovRequest

    await auditService.record({ actor, action: `REQUEST_${action.toUpperCase()}`, targetId: id, targetType: 'request', organizationId: req.organizationId, metadata: { reference: req.reference, note } })
    const recipients = actor.role === 'government' ? await institutionRecipients(req.organizationId) : await governmentRecipients()
    for (const u of recipients) {
      await notificationService.create({ recipientId: u.id, type: actor.role === 'government' ? 'government' : 'request', title: `Request ${status.replace('_', ' ')}`, message: `${req.reference} — ${note || req.title}`, actionUrl: actor.role === 'government' ? '/school/government' : '/government/requests' })
    }
    return updated
  },

  async officers(): Promise<{ id: Id; name: string }[]> {
    return (await governmentRecipients()).map((u) => ({ id: u.id, name: u.name }))
  },
  async schoolName(id: Id): Promise<string> {
    const o = (await organizationsRepo.get(id)) as Organization | null
    return o?.officialName ?? id
  },
}
