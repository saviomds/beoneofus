import { api } from '@/lib/api'
import type { Enrollment, Id } from '@shared/types'

type A = unknown

export const enrollmentService = {
  history: (_a: A, studentId: Id) => api.get<Enrollment[]>(`/students/${studentId}/enrollments`),
  enroll: (_a: A, input: Record<string, unknown>) => api.post<Enrollment>('/enrollments', input),
  promote: (_a: A, studentId: Id, toGrade: string, academicYear: string) =>
    api.post<Enrollment>('/enrollments/promote', { studentId, toGrade, academicYear }),
  graduate: (_a: A, studentId: Id) => api.post(`/students/${studentId}/graduate`),
  withdraw: (_a: A, studentId: Id, reason: string) => api.post(`/students/${studentId}/withdraw`, { reason }),
}
