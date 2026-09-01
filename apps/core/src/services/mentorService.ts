import { api } from '@/lib/api'
import type { Id, Mentor, MentorshipSession, SessionStatus, Student } from '@shared/types'

type A = unknown

export const mentorService = {
  myMentor: (_a: A) => api.get<Mentor | null>('/mentorship/mine'),
  mentees: (_a: A) => api.get<Student[]>('/mentorship/mentees'),
  sessions: (_a: A, filter: { studentId?: Id } = {}) =>
    api.get<MentorshipSession[]>('/mentorship/sessions', filter as Record<string, unknown>),
  schedule: (_a: A, input: Record<string, unknown>) => api.post<MentorshipSession>('/mentorship/sessions', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<MentorshipSession>(`/mentorship/sessions/${id}`, patch),
  setStatus: (_a: A, id: Id, status: SessionStatus) => api.patch<MentorshipSession>(`/mentorship/sessions/${id}`, { status }),
}
