import express from 'express'
import type { RequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { h, errorHandler, num } from './http'
import { attachUser, requireAuth, requirePermission, COOKIE_NAME } from './middleware/auth'
import { rateLimit } from './lib/rate-limit'
import { AuthError } from './lib/errors'
import { PERMISSIONS as P } from '@shared/rbac'

import { authService } from './services/authService'
import { organizationService } from './services/organizationService'
import { studentService } from './services/studentService'
import { teacherService } from './services/teacherService'
import { directoryService } from './services/directoryService'
import { enrollmentService } from './services/enrollmentService'
import { transferService } from './services/transferService'
import { universityService } from './services/universityService'
import { mentorService } from './services/mentorService'
import { reportService } from './services/reportService'
import { requestService } from './services/requestService'
import { announcementService } from './services/announcementService'
import { documentService } from './services/documentService'
import { messageService } from './services/messageService'
import { analyticsService } from './services/analyticsService'
import { settingsService } from './services/settingsService'
import { userService } from './services/userService'
import { invitationService } from './services/invitationService'
import { recordRequestService } from './services/recordRequestService'
import { consentService } from './services/consentService'
import { credentialService } from './services/credentialService'
import { campaignService } from './services/campaignService'
import { academicService } from './services/academicService'
import { reportCardPdf, transcriptPdf } from './lib/pdf'
import { organizationsRepo, studentsRepo } from './lib/db'
import { attendanceService } from './services/attendanceService'
import { interventionService } from './services/interventionService'
import { guardianService } from './services/guardianService'
import { timetableService } from './services/timetableService'
import { admissionService } from './services/admissionService'
import { financeService } from './services/financeService'
import { importService } from './services/importService'
import { batchService } from './services/batchService'
import { searchService } from './services/searchService'
import { notificationService } from './services/notificationService'
import { auditService } from './services/auditService'
import { systemService } from './services/systemService'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_DIR = join(HERE, '..', 'dist')

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(attachUser)

  const api = express.Router()

  function setSessionCookie(res: express.Response, sessionId: string, expiresAt: number) {
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      // Only mark Secure when actually served over HTTPS (set COOKIE_SECURE=true
      // behind a TLS-terminating proxy). Local http:// dev/prod must send the cookie.
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
      expires: new Date(expiresAt),
    })
  }
  const user = (req: express.Request) => {
    if (!req.user) throw new AuthError('Please sign in.', 'unauthenticated')
    return req.user
  }

  // ---- auth ---------------------------------------------------------- ---
  // Per-account lockout (5 failures -> 10 min) is the primary brute-force
  // defence; this IP window is a coarse backstop. Disabled under NODE_ENV=test.
  const authLimiter: RequestHandler =
    process.env.NODE_ENV === 'test'
      ? (_req, _res, next) => next()
      : rateLimit({ windowMs: 60_000, max: 40, key: (ip) => `auth:${ip}` })
  api.post('/auth/login', authLimiter, h(async (req, res) => {
    const { code, password } = req.body ?? {}
    const { safe, sessionId, expiresAt } = await authService.login(String(code ?? ''), String(password ?? ''), req.ctx)
    setSessionCookie(res, sessionId, expiresAt)
    const session = { id: sessionId, userId: safe.id, createdAt: Date.now(), expiresAt, ip: req.ctx.ip, userAgent: req.ctx.userAgent, impersonatorId: null }
    return authService.me(safe, session)
  }))
  api.post('/auth/logout', h(async (req, res) => {
    await authService.logout(req.sessionId, req.user)
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return { ok: true }
  }))
  api.get('/auth/me', h(async (req) => {
    if (!req.user || !req.session) throw new AuthError('Not signed in.', 'unauthenticated')
    return authService.me(req.user, req.session)
  }))
  api.post('/auth/change-password', requireAuth, h(async (req) => {
    await authService.changePassword(user(req), String(req.body?.currentPassword ?? ''), String(req.body?.newPassword ?? ''))
    return { ok: true }
  }))
  api.post('/auth/rotate-code', requireAuth, h(async (req) => ({ code: await authService.rotateCode(user(req)) })))
  api.post('/auth/support-view', requireAuth, requirePermission(P.SUPPORT_IMPERSONATE), h(async (req, res) => {
    const { sessionId, expiresAt } = await authService.startSupportView(user(req), String(req.body?.targetId ?? ''), req.ctx)
    setSessionCookie(res, sessionId, expiresAt)
    return { ok: true }
  }))
  api.post('/auth/end-support-view', h(async (req, res) => {
    await authService.endSupportView(req.sessionId)
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return { ok: true }
  }))
  api.post('/auth/forgot-password', authLimiter, h(async (req) => {
    // Demo: no email. Returns a token to display.
    const token = 'RESET-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    await auditService.record({ actor: { id: String(req.body?.code ?? 'unknown'), role: 'system' }, action: 'PASSWORD_RESET_REQUESTED', metadata: { code: req.body?.code } })
    return { token, delivered: false }
  }))

  // ---- public: credential verification ------------------------------- --
  // No authentication. Returns only issuer + credential + holder name + status.
  api.get('/verify/:code', rateLimit({ windowMs: 60_000, max: 60 }), h(async (req) => await credentialService.verifyPublic(req.params.code)))

  // ---- public onboarding ---------------------------------------------- --
  api.get('/invite/:token', h(async (req) => await invitationService.getByToken(req.params.token)))
  api.post('/invite/:token/accept', rateLimit({ windowMs: 60_000, max: 6 }), h(async (req, res) => {
    const result = await invitationService.accept(req.params.token, req.body ?? {})
    void res
    return result
  }))

  // Everything below requires a session.
  api.use(requireAuth)

  // ---- notifications / messages / settings / search ------------------- --
  api.get('/notifications', h(async (req) => await notificationService.forUser(user(req).id)))
  api.get('/notifications/unread-count', h(async (req) => ({ count: await notificationService.unreadCount(user(req).id) })))
  api.post('/notifications/:id/read', h(async (req) => await notificationService.markRead(req.params.id, user(req).id)))
  api.post('/notifications/read-all', h(async (req) => { await notificationService.markAllRead(user(req).id); return { ok: true } }))
  api.delete('/notifications/:id', h(async (req) => { await notificationService.remove(req.params.id, user(req).id); return { ok: true } }))

  api.get('/messages/contacts', h(async (req) => await messageService.contactsFor(user(req))))
  api.get('/messages/conversations', h(async (req) => await messageService.conversations(user(req))))
  api.get('/messages/conversations/:id', h(async (req) => await messageService.thread(user(req), req.params.id)))
  api.post('/messages/conversations', h(async (req) => await messageService.startConversation(user(req), req.body.recipientId, req.body.subject ?? '', req.body.body ?? '')))
  api.post('/messages/conversations/:id', h(async (req) => await messageService.send(user(req), req.params.id, req.body.body ?? '')))

  api.get('/settings', h(async (req) => await settingsService.forActor(user(req))))
  api.put('/settings', h(async (req) => await settingsService.save(user(req), req.body?.values ?? {})))
  api.get('/search', h(async (req) => await searchService.query(user(req), String(req.query.q ?? ''))))

  api.get('/directory/names', h(async (req) => {
    const ids = String(req.query.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    return await directoryService.namesFor(user(req), ids)
  }))

  api.post('/admin/broadcast', requirePermission(P.USERS_MANAGE), h(async (req) => {
    const b = req.body ?? {}
    const targets = await userService.list(user(req), b.audience && b.audience !== 'all' ? { role: b.audience } : {})
    for (const u of targets.rows) {
      await notificationService.create({ recipientId: u.id, type: 'system', title: String(b.title ?? ''), message: String(b.message ?? '') })
    }
    await auditService.record({ actor: user(req), action: 'NOTIFICATION_BROADCAST', metadata: { audience: b.audience, count: targets.rows.length } })
    return { sent: targets.rows.length }
  }))

  // ---- organizations / institution profile --------------------------- ---
  api.get('/organizations', h(async (req) => await organizationService.list(user(req))))
  api.get('/organizations/mine', h(async (req) => await organizationService.mine(user(req))))
  api.get('/organizations/:id', h(async (req) => await organizationService.get(user(req), req.params.id)))
  api.patch('/organizations/:id', h(async (req) => await organizationService.update(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.post('/organizations/:id/status', requirePermission(P.ORG_APPROVE), h(async (req) => await organizationService.setStatus(user(req), req.params.id, req.body.status, req.body.note)))

  // ---- invitations (admin/government) -------------------------------- ----
  api.get('/invitations', h(async (req) => await invitationService.list(user(req))))
  api.post('/invitations', requirePermission(P.INVITATION_CREATE), h(async (req) => await invitationService.create(user(req), req.body ?? {})))
  api.post('/invitations/:id/revoke', requirePermission(P.INVITATION_REVOKE), h(async (req) => { await invitationService.revoke(user(req), req.params.id); return { ok: true } }))

  // ---- students ---------------------------------------------------- ------
  api.get('/students', h(async (req) => await studentService.list(user(req), { page: num(req.query.page), limit: num(req.query.limit), search: req.query.search as string, status: req.query.status as string, classId: req.query.classId as string, gradeLevel: req.query.gradeLevel as string })))
  api.get('/students/me', h(async (req) => await studentService.profileFor(user(req))))
  api.get('/students/:id', h(async (req) => await studentService.getById(user(req), req.params.id)))
  api.get('/students/:id/academic', h(async (req) => await studentService.academicFor(user(req), req.params.id)))
  api.get('/students/:id/attendance', h(async (req) => await studentService.attendanceFor(user(req), req.params.id)))
  api.get('/students/:id/attendance-rate', h(async (req) => ({ rate: await studentService.attendanceRate(user(req), req.params.id) })))
  api.get('/students/:id/average', h(async (req) => ({ average: await studentService.academicAverage(user(req), req.params.id) })))
  api.get('/students/:id/reports', h(async (req) => await studentService.reportsFor(user(req), req.params.id)))
  api.get('/students/:id/credentials', h(async (req) => await studentService.credentialsFor(user(req), req.params.id)))
  api.get('/students/:id/sessions', h(async (req) => await studentService.sessionsFor(user(req), req.params.id)))
  api.get('/students/:id/enrollments', h(async (req) => await enrollmentService.history(user(req), req.params.id)))
  api.get('/students/:id/assessments', h(async (req) => await academicService.assessments(user(req), { studentId: req.params.id, term: req.query.term as string })))
  api.get('/students/:id/report-cards', h(async (req) => await academicService.reportCards(user(req), { studentId: req.params.id })))
  api.get('/students/:id/transcript', h(async (req) => await academicService.transcript(user(req), req.params.id)))
  api.post('/students', requirePermission(P.STUDENTS_CREATE), h(async (req) => await studentService.create(user(req), req.body ?? {})))
  api.patch('/students/:id', h(async (req) => await studentService.update(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.post('/students/:id/archive', h(async (req) => { await studentService.archive(user(req), req.params.id); return { ok: true } }))
  api.post('/students/:id/assign', h(async (req) => {
    const u = user(req)
    const b = req.body ?? {}
    if (b.classId !== undefined) await studentService.assignClass(u, req.params.id, b.classId || null)
    if (b.teacherId !== undefined) await studentService.assignTeacher(u, req.params.id, b.teacherId || null)
    if (b.mentorId !== undefined) await studentService.assignMentor(u, req.params.id, b.mentorId || null)
    return await studentService.getById(u, req.params.id)
  }))

  // ---- enrollment / transfers -------------------------------------- ------
  api.post('/enrollments', requirePermission(P.ENROLLMENT_MANAGE), h(async (req) => await enrollmentService.enroll(user(req), req.body ?? {})))
  api.post('/enrollments/promote', requirePermission(P.ENROLLMENT_MANAGE), h(async (req) => await enrollmentService.promote(user(req), req.body.studentId, req.body.toGrade, req.body.academicYear)))
  api.post('/students/:id/graduate', requirePermission(P.ENROLLMENT_MANAGE), h(async (req) => { await enrollmentService.graduate(user(req), req.params.id); return { ok: true } }))
  api.post('/students/:id/withdraw', requirePermission(P.ENROLLMENT_MANAGE), h(async (req) => { await enrollmentService.withdraw(user(req), req.params.id, req.body?.reason ?? ''); return { ok: true } }))

  api.get('/transfers', h(async (req) => await transferService.list(user(req))))
  api.get('/transfers/destinations', h(async (req) => await transferService.destinations(user(req))))
  api.post('/transfers', requirePermission(P.TRANSFER_INITIATE), h(async (req) => await transferService.initiate(user(req), req.body ?? {})))
  api.post('/transfers/:id/:action', h(async (req) => await transferService.advance(user(req), req.params.id, req.params.action as 'approve' | 'reject' | 'accept' | 'cancel', req.body?.note ?? '')))

  // ---- inter-institution record requests / consent ---------------- -------
  api.get('/record-requests', h(async (req) => await recordRequestService.list(user(req))))
  api.get('/record-requests/sources', h(async (req) => await recordRequestService.sources(user(req))))
  api.get('/record-requests/:id', h(async (req) => await recordRequestService.get(user(req), req.params.id)))
  api.post('/record-requests', requirePermission(P.RECORDS_REQUEST), h(async (req) => await recordRequestService.create(user(req), req.body ?? {})))
  api.post('/record-requests/:id/review', requirePermission(P.RECORDS_SHARE), h(async (req) => await recordRequestService.review(user(req), req.params.id, req.body?.decision, req.body ?? {})))
  api.post('/record-requests/:id/revoke', requirePermission(P.RECORDS_SHARE), h(async (req) => await recordRequestService.revoke(user(req), req.params.id, req.body?.note ?? '')))

  api.get('/consents', h(async (req) => await consentService.list(user(req))))
  api.get('/consents/:id', h(async (req) => await consentService.get(user(req), req.params.id)))
  api.post('/consents', requirePermission(P.CONSENT_MANAGE), h(async (req) => await consentService.record(user(req), req.body ?? {})))
  api.post('/consents/:id/withdraw', requirePermission(P.CONSENT_MANAGE), h(async (req) => await consentService.withdraw(user(req), req.params.id, req.body?.note ?? '')))

  // ---- credentials (issue / revoke; verify is public above) ------- -------
  api.get('/credentials', h(async (req) => await credentialService.listForOrg(user(req))))
  api.post('/credentials', requirePermission(P.CREDENTIALS_ISSUE), h(async (req) => await credentialService.issue(user(req), req.body ?? {})))
  api.post('/credentials/:id/revoke', requirePermission(P.CREDENTIALS_REVOKE), h(async (req) => await credentialService.revoke(user(req), req.params.id, req.body?.reason ?? '')))

  // ---- government data campaigns --------------------------------- ---------
  api.get('/campaigns', h(async (req) => await campaignService.list(user(req))))
  api.get('/campaigns/:id', h(async (req) => await campaignService.get(user(req), req.params.id)))
  api.post('/campaigns', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.create(user(req), req.body ?? {})))
  api.patch('/campaigns/:id', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.update(user(req), req.params.id, req.body ?? {})))
  api.post('/campaigns/:id/publish', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.publish(user(req), req.params.id)))
  api.post('/campaigns/:id/close', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.close(user(req), req.params.id)))
  api.get('/campaigns/:id/dashboard', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.dashboard(user(req), req.params.id)))
  api.get('/campaigns/:id/submissions', requirePermission(P.CAMPAIGN_MANAGE), h(async (req) => await campaignService.submissions(user(req), req.params.id)))
  api.get('/campaigns/:id/submission', h(async (req) => await campaignService.submissionFor(user(req), req.params.id)))
  api.put('/campaigns/:id/submission', requirePermission(P.CAMPAIGN_RESPOND), h(async (req) => await campaignService.saveSubmission(user(req), req.params.id, req.body?.data ?? {})))
  api.post('/campaigns/:id/submit', requirePermission(P.CAMPAIGN_RESPOND), h(async (req) => await campaignService.submit(user(req), req.params.id)))
  api.post('/campaign-submissions/:id/review', requirePermission(P.CAMPAIGN_REVIEW), h(async (req) => await campaignService.reviewSubmission(user(req), req.params.id, req.body?.decision, req.body?.note ?? '')))

  // ---- teachers / mentors / classes / subjects -------------------- -------
  api.get('/teachers', h(async (req) => await directoryService.teachers(user(req))))
  api.get('/teachers/me', h(async (req) => await directoryService.teacherForUser(user(req).id)))
  api.get('/teachers/:id', h(async (req) => await directoryService.teacherById(user(req), req.params.id)))
  api.post('/teachers', requirePermission(P.TEACHERS_MANAGE), h(async (req) => await directoryService.createTeacher(user(req), req.body ?? {})))
  api.patch('/teachers/:id', h(async (req) => await directoryService.updateTeacher(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.get('/teachers/:id/students', h(async (req) => await directoryService.studentsForTeacher(user(req), req.params.id)))

  api.get('/mentors', h(async (req) => await directoryService.mentors(user(req))))
  api.get('/mentorship/mine', h(async (req) => await mentorService.myMentor(user(req))))
  api.get('/mentorship/mentees', h(async (req) => await mentorService.mentees(user(req))))
  api.get('/mentorship/sessions', h(async (req) => await mentorService.sessions(user(req), { studentId: req.query.studentId as string })))
  api.post('/mentorship/sessions', requirePermission(P.MENTORSHIP_CONDUCT), h(async (req) => await mentorService.schedule(user(req), req.body ?? {})))
  api.patch('/mentorship/sessions/:id', h(async (req) => await mentorService.update(user(req), req.params.id, req.body ?? {})))

  api.get('/classes', h(async (req) => await directoryService.classes(user(req))))
  api.get('/classes/:id', h(async (req) => await directoryService.classById(user(req), req.params.id)))
  api.post('/classes', requirePermission(P.CLASSES_MANAGE), h(async (req) => await directoryService.createClass(user(req), req.body ?? {})))
  api.patch('/classes/:id', h(async (req) => await directoryService.updateClass(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.get('/subjects', h(async (req) => await directoryService.subjects(user(req))))
  api.post('/subjects', requirePermission(P.CLASSES_MANAGE), h(async (req) => await directoryService.createSubject(user(req), req.body ?? {})))

  // ---- attendance / academic ------------------------------------ ---------
  api.get('/classes/:id/roster', h(async (req) => await teacherService.roster(user(req), req.params.id)))
  api.get('/classes/:id/attendance', h(async (req) => await teacherService.attendanceForDate(user(req), req.params.id, String(req.query.date ?? ''))))
  api.post('/classes/:id/attendance', requirePermission(P.ATTENDANCE_RECORD), h(async (req) => { await teacherService.recordAttendance(user(req), req.params.id, req.body.date, req.body.entries ?? [], { period: req.body.period, subjectId: req.body.subjectId }); return { ok: true } }))
  api.post('/academic', requirePermission(P.ACADEMIC_RECORD), h(async (req) => await teacherService.addGrade(user(req), req.body ?? {})))
  api.get('/students/:id/progress', h(async (req) => await analyticsService.studentProgress(user(req), req.params.id)))

  // ---- attendance: excuse workflow ------------------------------- ---------
  api.get('/attendance/excuses/pending', requirePermission(P.ATTENDANCE_EXCUSE), h(async (req) => await attendanceService.pendingExcuses(user(req))))
  api.post('/attendance/:id/excuse', h(async (req) => await attendanceService.requestExcuse(user(req), req.params.id, String(req.body?.reason ?? ''))))
  api.post('/attendance/:id/excuse/review', requirePermission(P.ATTENDANCE_EXCUSE), h(async (req) => await attendanceService.reviewExcuse(user(req), req.params.id, req.body?.decision, req.body?.note ?? '')))

  // ---- weighted assessments / schemes / report cards / transcripts ------ --
  api.get('/academic/schemes', h(async (req) => await academicService.schemes(user(req))))
  api.post('/academic/schemes', requirePermission(P.SCHEME_MANAGE), h(async (req) => await academicService.createScheme(user(req), req.body ?? {})))
  api.patch('/academic/schemes/:id', requirePermission(P.SCHEME_MANAGE), h(async (req) => await academicService.updateScheme(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.get('/assessments', h(async (req) => await academicService.assessments(user(req), { studentId: req.query.studentId as string, classId: req.query.classId as string, subjectId: req.query.subjectId as string, term: req.query.term as string })))
  api.post('/assessments', requirePermission(P.ASSESSMENT_MANAGE), h(async (req) => await academicService.recordAssessment(user(req), req.body ?? {})))
  api.post('/assessments/bulk', requirePermission(P.ASSESSMENT_MANAGE), h(async (req) => await academicService.bulkRecordAssessments(user(req), req.body?.entries ?? [])))
  api.post('/report-cards/compute', h(async (req) => await academicService.computeReportCard(user(req), req.body ?? {})))
  api.post('/report-cards/generate', requirePermission(P.REPORTCARD_MANAGE), h(async (req) => await academicService.generateReportCards(user(req), req.body ?? {})))
  api.get('/report-cards', h(async (req) => await academicService.reportCards(user(req), { classId: req.query.classId as string, term: req.query.term as string, status: req.query.status as never })))
  api.get('/report-cards/:id', h(async (req) => await academicService.getReportCard(user(req), req.params.id)))
  api.patch('/report-cards/:id', requirePermission(P.REPORTCARD_MANAGE), h(async (req) => await academicService.updateReportCard(user(req), req.params.id, req.body ?? {})))
  api.post('/report-cards/:id/publish', requirePermission(P.REPORTCARD_PUBLISH), h(async (req) => await academicService.publishReportCard(user(req), req.params.id)))

  // server-rendered PDF (streamed, audited)
  api.get('/report-cards/:id/pdf', (req, res, next) => {
    (async () => {
      const u = user(req)
      const card = await academicService.getReportCard(u, req.params.id)
      const [org, student] = await Promise.all([
        organizationsRepo.get(card.organizationId),
        studentsRepo.get(card.studentId),
      ])
      await auditService.record({ actor: u, action: 'REPORT_CARD_EXPORTED', targetId: card.id, targetType: 'reportCard', organizationId: card.organizationId, metadata: { format: 'pdf' } })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${card.reference}.pdf"`)
      reportCardPdf(card, org as never, student as never).pipe(res)
    })().catch(next)
  })
  api.get('/students/:id/transcript.pdf', (req, res, next) => {
    (async () => {
      const u = user(req)
      const t = await academicService.transcript(u, req.params.id)
      const student = await studentsRepo.get(req.params.id)
      const org = student ? await organizationsRepo.get((student as { organizationId: string }).organizationId) : null
      await auditService.record({ actor: u, action: 'TRANSCRIPT_EXPORTED', targetId: req.params.id, targetType: 'student', metadata: { format: 'pdf' } })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="transcript-${t.student.number}.pdf"`)
      transcriptPdf(t, org as never).pipe(res)
    })().catch(next)
  })

  // ---- interventions ------------------------------------------- -----------
  api.get('/interventions', requirePermission(P.INTERVENTION_MANAGE), h(async (req) => await interventionService.list(user(req), { studentId: req.query.studentId as string, status: req.query.status as never, kind: req.query.kind as never })))
  api.get('/interventions/:id', requirePermission(P.INTERVENTION_MANAGE), h(async (req) => await interventionService.get(user(req), req.params.id)))
  api.post('/interventions', requirePermission(P.INTERVENTION_MANAGE), h(async (req) => await interventionService.open(user(req), req.body ?? {})))
  api.post('/interventions/:id/advance', requirePermission(P.INTERVENTION_MANAGE), h(async (req) => await interventionService.advance(user(req), req.params.id, req.body ?? {})))

  // ---- timetable ------------------------------------------- ---------------
  api.get('/classes/:id/timetable', h(async (req) => await timetableService.forClass(user(req), req.params.id)))
  api.get('/teachers/:id/timetable', h(async (req) => await timetableService.forTeacher(user(req), req.params.id)))
  api.post('/timetable', requirePermission(P.TIMETABLE_MANAGE), h(async (req) => await timetableService.create(user(req), req.body ?? {})))
  api.patch('/timetable/:id', requirePermission(P.TIMETABLE_MANAGE), h(async (req) => await timetableService.update(user(req), req.params.id, req.body ?? {})))
  api.delete('/timetable/:id', requirePermission(P.TIMETABLE_MANAGE), h(async (req) => { await timetableService.remove(user(req), req.params.id); return { ok: true } }))

  // ---- admissions ----------------------------------------- ----------------
  api.get('/applications', requirePermission(P.ADMISSIONS_VIEW), h(async (req) => await admissionService.list(user(req), { status: req.query.status as never, intakeYear: req.query.intakeYear as string })))
  api.get('/applications/:id', requirePermission(P.ADMISSIONS_VIEW), h(async (req) => await admissionService.get(user(req), req.params.id)))
  api.post('/applications', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.create(user(req), req.body ?? {})))
  api.post('/applications/:id/submit', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.submit(user(req), req.params.id)))
  api.post('/applications/:id/review', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.review(user(req), req.params.id, req.body?.decision, req.body ?? {})))
  api.post('/applications/:id/accept-offer', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.acceptOffer(user(req), req.params.id, req.body?.note ?? '')))
  api.post('/applications/:id/withdraw', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.withdraw(user(req), req.params.id, req.body?.note ?? '')))
  api.post('/applications/:id/enroll', requirePermission(P.ADMISSIONS_MANAGE), h(async (req) => await admissionService.enroll(user(req), req.params.id, req.body ?? {})))

  // ---- finance -------------------------------------------- ----------------
  api.get('/finance/summary', requirePermission(P.FINANCE_VIEW), h(async (req) => await financeService.summary(user(req))))
  api.get('/finance/fee-structures', requirePermission(P.FINANCE_VIEW), h(async (req) => await financeService.feeStructures(user(req))))
  api.post('/finance/fee-structures', requirePermission(P.FINANCE_MANAGE), h(async (req) => await financeService.createFeeStructure(user(req), req.body ?? {})))
  api.get('/finance/scholarships', requirePermission(P.FINANCE_VIEW), h(async (req) => await financeService.scholarships(user(req))))
  api.post('/finance/scholarships', requirePermission(P.FINANCE_MANAGE), h(async (req) => await financeService.createScholarship(user(req), req.body ?? {})))
  api.get('/finance/invoices', h(async (req) => await financeService.invoices(user(req), { studentId: req.query.studentId as string, status: req.query.status as never })))
  api.get('/finance/invoices/:id', h(async (req) => await financeService.getInvoice(user(req), req.params.id)))
  api.post('/finance/invoices', requirePermission(P.FINANCE_MANAGE), h(async (req) => await financeService.createInvoice(user(req), req.body ?? {})))
  api.post('/finance/invoices/:id/status', requirePermission(P.FINANCE_MANAGE), h(async (req) => await financeService.setInvoiceStatus(user(req), req.params.id, req.body?.status)))
  api.post('/finance/payments', requirePermission(P.FINANCE_MANAGE), h(async (req) => await financeService.recordPayment(user(req), req.body ?? {})))

  // ---- bulk import / year-end batch ---------------------- -----------------
  api.post('/import/:kind/validate', requirePermission(P.IMPORT_DATA), h(async (req) => await importService.validate(user(req), req.params.kind as never, String(req.body?.csv ?? ''))))
  api.post('/import/:kind/commit', requirePermission(P.IMPORT_DATA), h(async (req) => await importService.commit(user(req), req.params.kind as never, String(req.body?.csv ?? ''))))
  api.post('/batch/promotion/preview', requirePermission(P.BATCH_OPERATIONS), h(async (req) => await batchService.previewPromotion(user(req), req.body ?? {})))
  api.post('/batch/promotion/commit', requirePermission(P.BATCH_OPERATIONS), h(async (req) => await batchService.commitPromotion(user(req), req.body ?? {})))
  api.post('/batch/graduation/preview', requirePermission(P.BATCH_OPERATIONS), h(async (req) => await batchService.previewGraduation(user(req), req.body ?? {})))
  api.post('/batch/graduation/commit', requirePermission(P.BATCH_OPERATIONS), h(async (req) => await batchService.commitGraduation(user(req), req.body ?? {})))
  api.post('/batch/archive-class', requirePermission(P.BATCH_OPERATIONS), h(async (req) => await batchService.archiveClass(user(req), req.body?.classId)))

  // ---- guardians -------------------------------------------- --------------
  api.get('/guardian/children', requirePermission(P.GUARDIAN_PORTAL), h(async (req) => await guardianService.myChildren(user(req))))
  api.get('/guardian/children/:id', requirePermission(P.GUARDIAN_PORTAL), h(async (req) => await guardianService.childOverview(user(req), req.params.id)))
  api.post('/guardian/attendance/:id/excuse', requirePermission(P.GUARDIAN_PORTAL), h(async (req) => await guardianService.requestExcuse(user(req), req.params.id, String(req.body?.reason ?? ''))))
  api.get('/guardians/links', requirePermission(P.GUARDIAN_LINK_MANAGE), h(async (req) => await guardianService.links(user(req), { studentId: req.query.studentId as string })))
  api.post('/guardians/links', requirePermission(P.GUARDIAN_LINK_MANAGE), h(async (req) => await guardianService.linkGuardian(user(req), req.body ?? {})))
  api.patch('/guardians/links/:id', requirePermission(P.GUARDIAN_LINK_MANAGE), h(async (req) => await guardianService.updateLink(user(req), req.params.id, req.body ?? {})))
  api.post('/guardians/links/:id/revoke', requirePermission(P.GUARDIAN_LINK_MANAGE), h(async (req) => { await guardianService.revokeLink(user(req), req.params.id); return { ok: true } }))

  // ---- university structures ---------------------------------- -----------
  api.get('/university/faculties', h(async (req) => await universityService.faculties(user(req))))
  api.post('/university/faculties', requirePermission(P.UNIVERSITY_MANAGE), h(async (req) => await universityService.createFaculty(user(req), req.body ?? {})))
  api.get('/university/departments', h(async (req) => await universityService.departments(user(req), req.query.facultyId as string)))
  api.post('/university/departments', requirePermission(P.UNIVERSITY_MANAGE), h(async (req) => await universityService.createDepartment(user(req), req.body ?? {})))
  api.get('/university/programs', h(async (req) => await universityService.programs(user(req), req.query.departmentId as string)))
  api.post('/university/programs', requirePermission(P.UNIVERSITY_MANAGE), h(async (req) => await universityService.createProgram(user(req), req.body ?? {})))
  api.get('/university/courses', h(async (req) => await universityService.courses(user(req), req.query.programId as string)))
  api.post('/university/courses', requirePermission(P.UNIVERSITY_MANAGE), h(async (req) => await universityService.createCourse(user(req), req.body ?? {})))

  // ---- reports / requests / announcements / documents ---------- ----------
  api.get('/reports', h(async (req) => await reportService.list(user(req), { page: num(req.query.page), limit: num(req.query.limit), status: req.query.status as never, type: req.query.type as string, authorId: req.query.authorId as string })))
  api.get('/reports/pending', h(async (req) => await reportService.pendingReview(user(req))))
  api.get('/reports/:id', h(async (req) => await reportService.get(user(req), req.params.id)))
  api.post('/reports', requirePermission(P.REPORTS_CREATE), h(async (req) => await reportService.create(user(req), req.body ?? {})))
  api.patch('/reports/:id', h(async (req) => await reportService.update(user(req), req.params.id, req.body ?? {}, num(req.body?.expectedVersion))))
  api.post('/reports/:id/submit', h(async (req) => await reportService.submit(user(req), req.params.id)))
  api.post('/reports/:id/review', requirePermission(P.REPORTS_APPROVE), h(async (req) => await reportService.review(user(req), req.params.id, req.body.decision, req.body.note ?? '')))

  api.get('/requests', h(async (req) => await requestService.list(user(req), { status: req.query.status as never, officerId: req.query.officerId as string })))
  api.get('/requests/officers', h(async () => await requestService.officers()))
  api.get('/requests/:id', h(async (req) => await requestService.get(user(req), req.params.id)))
  api.post('/requests', requirePermission(P.REQUESTS_CREATE), h(async (req) => await requestService.create(user(req), req.body ?? {})))
  api.post('/requests/:id/advance', h(async (req) => await requestService.advance(user(req), req.params.id, req.body.action, req.body.note ?? '', { officerId: req.body.officerId, response: req.body.response })))

  api.get('/announcements', h(async (req) => await announcementService.feedFor(user(req))))
  api.get('/announcements/authored', h(async (req) => await announcementService.authored(user(req))))
  api.post('/announcements', requirePermission(P.ANNOUNCEMENTS_CREATE), h(async (req) => await announcementService.create(user(req), req.body ?? {})))
  api.post('/announcements/:id/pin', h(async (req) => await announcementService.setPinned(user(req), req.params.id, Boolean(req.body?.pinned))))
  api.delete('/announcements/:id', h(async (req) => { await announcementService.remove(user(req), req.params.id); return { ok: true } }))

  api.get('/documents', h(async (req) => req.query.ownerId ? await documentService.forOwner(user(req), req.query.ownerId as string) : await documentService.forOrganization(user(req))))
  api.post('/documents', h(async (req) => await documentService.register(user(req), req.body ?? {})))
  api.post('/documents/:id/status', requirePermission(P.DOCUMENTS_MANAGE), h(async (req) => await documentService.setStatus(user(req), req.params.id, req.body.status)))
  api.delete('/documents/:id', requirePermission(P.DOCUMENTS_MANAGE), h(async (req) => { await documentService.remove(user(req), req.params.id); return { ok: true } }))

  // ---- analytics / audit --------------------------------------- ----------
  api.get('/analytics/institution', h(async (req) => await analyticsService.institution(user(req), user(req).organizationId ?? '__none__')))
  api.get('/analytics/government', requirePermission(P.ANALYTICS_GOVERNMENT), h(async (req) => await analyticsService.government(user(req))))
  api.get('/analytics/platform', requirePermission(P.ANALYTICS_PLATFORM), h(async (req) => await analyticsService.platform(user(req))))
  api.get('/audit', h(async (req) => {
    const u = user(req)
    if (u.role === 'admin') return auditService.list({ action: req.query.action as string, actorId: req.query.actorId as string })
    return auditService.list({ organizationId: u.organizationId ?? '__none__' })
  }))

  // ---- admin: users --------------------------------------------- ---------
  api.get('/admin/users', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.list(user(req), { page: num(req.query.page), limit: num(req.query.limit), role: req.query.role as never, status: req.query.status as never, search: req.query.search as string, organizationId: req.query.organizationId as string })))
  api.get('/admin/users/counts', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.counts(user(req))))
  api.get('/admin/users/:id', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.get(user(req), req.params.id)))
  api.post('/admin/users', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.create(user(req), req.body ?? {})))
  api.patch('/admin/users/:id', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.update(user(req), req.params.id, req.body ?? {})))
  api.post('/admin/users/:id/status', requirePermission(P.USERS_MANAGE), h(async (req) => await userService.setStatus(user(req), req.params.id, req.body.status)))
  api.post('/admin/organizations', requirePermission(P.ORG_CREATE), h(async (req) => await organizationService.create(user(req), req.body ?? {})))
  api.get('/admin/role-permissions/:role', requirePermission(P.USERS_MANAGE), h(async (req) => ({ permissions: userService.rolePermissions(req.params.role as never) })))

  // ---- admin: system / backups -------------------------------- -----------
  api.get('/system/health', requirePermission(P.SYSTEM_HEALTH), h(async (req) => await systemService.health(user(req))))
  api.post('/system/recheck', requirePermission(P.SYSTEM_HEALTH), h(async (req) => await systemService.recheck(user(req))))
  api.get('/system/backups', requirePermission(P.BACKUP_MANAGE), h(async (req) => await systemService.backups(user(req))))
  api.post('/system/backups', requirePermission(P.BACKUP_MANAGE), h(async (req) => await systemService.createBackup(user(req), req.body?.label ?? 'manual')))
  api.post('/system/restore', requirePermission(P.BACKUP_MANAGE), h(async (req) => await systemService.restoreBackup(user(req), req.body?.backupId, req.body?.confirm ?? '')))

  app.use('/api', api)
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } }))

  // ---- static client (production) ------------------------------ ----------
  if (existsSync(CLIENT_DIR)) {
    app.use(express.static(CLIENT_DIR))
    app.get('*', (_req, res) => res.sendFile(join(CLIENT_DIR, 'index.html')))
  }

  app.use(errorHandler)
  return app
}
