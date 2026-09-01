import { sessionsRepo, mentorsRepo, studentsRepo, usersRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, auditService, notificationService, loadOrgs } from './_shared'
import { NotFoundError } from '../lib/errors'
import { AuthorizationError } from '@shared/rbac'
import type { Id, Mentor, MentorshipSession, SafeUser, SessionStatus, Student } from '@shared/types'

function scrub(s: MentorshipSession, actor: SafeUser, ownerUserId: Id): MentorshipSession {
  if (actor.role === 'admin' || actor.id === ownerUserId) return s
  return { ...s, privateNote: '' }
}

export const mentorService = {
  async myMentor(actor: SafeUser): Promise<Mentor | null> {
    return (((await mentorsRepo.list({ userId: actor.id })) as Mentor[])[0]) ?? null
  },

  async mentees(actor: SafeUser): Promise<Student[]> {
    assertPermission(actor, P.MENTORSHIP_CONDUCT)
    const mentor = await this.myMentor(actor)
    if (!mentor) return []
    const all = (await studentsRepo.list()) as Student[]
    return all.filter((s) => mentor.assignedStudentIds.includes(s.id))
  },

  async sessions(actor: SafeUser, filter: { studentId?: Id } = {}): Promise<MentorshipSession[]> {
    const rows = (await sessionsRepo.list()) as MentorshipSession[]
    let scoped = rows
    if (actor.role === 'mentor' || actor.role === 'teacher') {
      const mentor = await this.myMentor(actor)
      scoped = mentor ? rows.filter((r) => r.mentorId === mentor.id) : []
    } else if (actor.role !== 'admin') {
      scoped = rows.filter((r) => r.organizationId === actor.organizationId)
    }
    if (filter.studentId) scoped = scoped.filter((r) => r.studentId === filter.studentId)
    return scoped.map((s) => scrub(s, actor, actor.id)).sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  async schedule(
    actor: SafeUser,
    input: { studentId: Id; date: string; time: string; topic: string; goals?: string[] },
  ): Promise<MentorshipSession> {
    assertPermission(actor, P.MENTORSHIP_CONDUCT)
    const mentor = await this.myMentor(actor)
    if (!mentor) throw new AuthorizationError('mentorship.conduct')
    const student = (await studentsRepo.get(input.studentId)) as Student | null
    if (!student) throw new NotFoundError('Student')
    assertTenant(actor, student, await loadOrgs())
    const session = (await sessionsRepo.create({
      mentorId: mentor.id, studentId: input.studentId, organizationId: student.organizationId, schoolId: student.organizationId,
      date: input.date, time: input.time, topic: input.topic, status: 'scheduled',
      goals: input.goals ?? [], progressNote: '', privateNote: '',
    }, actor.id)) as MentorshipSession
    await auditService.record({ actor, action: 'SESSION_SCHEDULED', targetId: session.id, targetType: 'session', organizationId: student.organizationId })
    await notificationService.create({ recipientId: student.userId, type: 'mentorship', title: 'Mentorship session scheduled', message: `${input.topic} on ${input.date} at ${input.time}.`, actionUrl: '/student/mentors', organizationId: student.organizationId })
    return session
  },

  async update(actor: SafeUser, id: Id, patch: Partial<MentorshipSession>): Promise<MentorshipSession> {
    assertPermission(actor, P.MENTORSHIP_CONDUCT)
    const session = (await sessionsRepo.get(id)) as MentorshipSession | null
    if (!session) throw new NotFoundError('Session')
    const mentor = await this.myMentor(actor)
    if (actor.role !== 'admin' && (!mentor || session.mentorId !== mentor.id)) throw new AuthorizationError('mentorship.conduct')
    const { id: _i, organizationId: _o, version: _v, ...safe } = patch
    void _i; void _o; void _v
    const updated = (await sessionsRepo.update(id, safe, { actorId: actor.id })) as MentorshipSession
    await auditService.record({ actor, action: 'SESSION_UPDATED', targetId: id, targetType: 'session', organizationId: session.organizationId })
    return updated
  },

  async setStatus(actor: SafeUser, id: Id, status: SessionStatus): Promise<MentorshipSession> {
    return this.update(actor, id, { status })
  },

  async menteeName(id: Id): Promise<string> {
    const s = (await studentsRepo.get(id)) as Student | null
    return s ? `${s.firstName} ${s.lastName}` : String(id)
  },
  async mentorName(mentorId: Id): Promise<string> {
    const m = (await mentorsRepo.get(mentorId)) as Mentor | null
    if (!m) return String(mentorId)
    const u = (await usersRepo.get(m.userId)) as { name: string } | null
    return u?.name ?? String(mentorId)
  },
}
