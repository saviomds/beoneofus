import { reportsRepo, usersRepo, studentsRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, notificationService, loadOrgs, recent, paginate } from './_shared'
import { NotFoundError } from '../lib/errors'
import { reference } from '../lib/codes'
import type { Id, Report, ReportStatus, SafeUser, Student, User } from '@shared/types'

const OPEN: ReportStatus[] = ['submitted', 'under_review']

export const reportService = {
  async list(actor: SafeUser, q: { page?: number; limit?: number; status?: ReportStatus; type?: string; authorId?: Id } = {}) {
    assertPermission(actor, P.REPORTS_VIEW)
    let rows = scopeRows(actor, (await reportsRepo.list()) as Report[], await loadOrgs())
    if (actor.role === 'student') rows = rows.filter((r) => r.status !== 'draft')
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.type) rows = rows.filter((r) => r.type === q.type)
    if (q.authorId) rows = rows.filter((r) => r.authorId === q.authorId)
    return paginate(recent(rows), q.page, q.limit)
  },

  async get(actor: SafeUser, id: Id): Promise<Report> {
    assertPermission(actor, P.REPORTS_VIEW)
    const r = (await reportsRepo.get(id)) as Report | null
    if (!r) throw new NotFoundError('Report')
    assertTenant(actor, r, await loadOrgs())
    return r
  },

  async pendingReview(actor: SafeUser) {
    assertPermission(actor, P.REPORTS_APPROVE)
    const rows = scopeRows(actor, (await reportsRepo.list()) as Report[], await loadOrgs())
    return recent(rows.filter((r) => OPEN.includes(r.status)))
  },

  async create(
    actor: SafeUser,
    input: Pick<Report, 'type' | 'subject' | 'content'> & Partial<Pick<Report, 'targetUserId' | 'attachments' | 'status'>>,
  ): Promise<Report> {
    assertPermission(actor, P.REPORTS_CREATE)
    const organizationId = actor.organizationId ?? null
    const ref = await reference(reportsRepo as never, 'RPT')
    const report = (await reportsRepo.create({
      reference: ref, organizationId, type: input.type, subject: input.subject, authorId: actor.id,
      targetUserId: input.targetUserId ?? null, content: input.content, attachments: input.attachments ?? [],
      status: input.status ?? 'draft', reviewedBy: null, reviewedAt: null, reviewNote: '',
    }, actor.id)) as Report
    await auditService.record({ actor, action: 'REPORT_CREATED', targetId: report.id, targetType: 'report', organizationId, metadata: { reference: ref } })
    if (report.status === 'submitted') await this.notifyOnSubmit(report)
    return report
  },

  async update(actor: SafeUser, id: Id, patch: Partial<Report>, expectedVersion?: number): Promise<Report> {
    assertPermission(actor, P.REPORTS_EDIT)
    const r = await this.get(actor, id)
    const { id: _i, organizationId: _o, version: _v, ...safe } = patch
    void _i; void _o; void _v
    const updated = (await reportsRepo.update(id, safe, { actorId: actor.id, expectedVersion })) as Report
    await auditService.record({ actor, action: 'REPORT_UPDATED', targetId: id, targetType: 'report', organizationId: r.organizationId })
    return updated
  },

  async submit(actor: SafeUser, id: Id): Promise<Report> {
    assertPermission(actor, P.REPORTS_CREATE)
    const r = await this.get(actor, id)
    const report = (await reportsRepo.update(id, { status: 'submitted' }, { actorId: actor.id })) as Report
    await auditService.record({ actor, action: 'REPORT_SUBMITTED', targetId: id, targetType: 'report', organizationId: r.organizationId, metadata: { reference: r.reference } })
    await this.notifyOnSubmit(report)
    return report
  },

  async review(actor: SafeUser, id: Id, decision: 'approved' | 'rejected' | 'under_review', note: string): Promise<Report> {
    assertPermission(actor, P.REPORTS_APPROVE)
    const r = await this.get(actor, id)
    const report = (await reportsRepo.update(id, { status: decision, reviewedBy: actor.id, reviewedAt: new Date().toISOString(), reviewNote: note }, { actorId: actor.id })) as Report
    await auditService.record({ actor, action: `REPORT_${decision.toUpperCase()}`, targetId: id, targetType: 'report', organizationId: r.organizationId, metadata: { reference: r.reference, note } })
    await notificationService.create({ recipientId: report.authorId, type: 'report', title: `Report ${decision.replace('_', ' ')}`, message: `${report.reference} — ${report.subject} was ${decision.replace('_', ' ')}.`, actionUrl: '/teacher/reports', organizationId: r.organizationId })
    if (decision === 'approved' && report.targetUserId) {
      await notificationService.create({ recipientId: report.targetUserId, type: 'report', title: 'New report available', message: `${report.subject} is now available.`, actionUrl: '/student/reports', organizationId: r.organizationId })
    }
    return report
  },

  async notifyOnSubmit(report: Report): Promise<void> {
    if (!report.organizationId) return
    const reviewers = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === report.organizationId && u.role === 'school')
    for (const u of reviewers) {
      await notificationService.create({ recipientId: u.id, type: 'report', title: 'Report submitted for review', message: `${report.reference} — ${report.subject}`, actionUrl: '/school/reports', organizationId: report.organizationId })
    }
  },

  async targetName(report: Report): Promise<string | null> {
    if (!report.targetUserId) return null
    const s = ((await studentsRepo.list({ userId: report.targetUserId })) as Student[])[0]
    if (s) return `${s.firstName} ${s.lastName}`
    const u = (await usersRepo.get(report.targetUserId)) as User | null
    return u?.name ?? null
  },
}
