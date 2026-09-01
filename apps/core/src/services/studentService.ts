import { api } from '@/lib/api'
import type {
  AcademicRecord, AttendanceRecord, Credential, Enrollment, Id, MentorshipSession,
  Organization, Page, Report, SafeUser, Student,
} from '@shared/types'

type A = unknown // client passes `user`; the server derives identity from the cookie

async function rows<T>(p: Promise<Page<T> | T[]>): Promise<T[]> {
  const r = await p
  return Array.isArray(r) ? r : r.rows
}

export const studentService = {
  list: (_a: A, q: { schoolId?: Id; search?: string; status?: string; classId?: Id } = {}) =>
    rows<Student>(api.get('/students', q as Record<string, unknown>)),
  getById: (_a: A, id: Id) => api.get<Student>(`/students/${id}`),
  getByUserId: (_a: A, _userId: Id) => api.get<{ student: Student }>('/students/me').then((r) => r.student),
  profileFor: (_a: A) =>
    api.get<{ student: Student; account: SafeUser; className: string | null; enrollment: Enrollment | null }>('/students/me'),
  academicFor: (_a: A, id: Id) => api.get<AcademicRecord[]>(`/students/${id}/academic`),
  attendanceFor: (_a: A, id: Id) => api.get<AttendanceRecord[]>(`/students/${id}/attendance`),
  attendanceRate: async (id: Id) => (await api.get<{ rate: number }>(`/students/${id}/attendance-rate`)).rate,
  academicAverage: async (id: Id) => (await api.get<{ average: number }>(`/students/${id}/average`)).average,
  reportsFor: (_a: A, id: Id) => api.get<Report[]>(`/students/${id}/reports`),
  credentialsFor: (_a: A, id: Id) => api.get<Credential[]>(`/students/${id}/credentials`),
  sessionsFor: (_a: A, id: Id) => api.get<MentorshipSession[]>(`/students/${id}/sessions`),
  enrollmentsFor: (_a: A, id: Id) => api.get<Enrollment[]>(`/students/${id}/enrollments`),
  create: (_a: A, input: Record<string, unknown>) => api.post<Student>('/students', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Student>(`/students/${id}`, patch),
  archive: (_a: A, id: Id) => api.post(`/students/${id}/archive`),
  assignClass: (_a: A, id: Id, classId: Id | null) => api.post<Student>(`/students/${id}/assign`, { classId: classId ?? '' }),
  assignTeacher: (_a: A, id: Id, teacherId: Id | null) => api.post<Student>(`/students/${id}/assign`, { teacherId: teacherId ?? '' }),
  assignMentor: (_a: A, id: Id, mentorId: Id | null) => api.post<Student>(`/students/${id}/assign`, { mentorId: mentorId ?? '' }),
  graduate: (_a: A, id: Id) => api.post(`/students/${id}/graduate`),
  withdraw: (_a: A, id: Id, reason: string) => api.post(`/students/${id}/withdraw`, { reason }),
}

export type { Organization }
