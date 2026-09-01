import { api } from '@/lib/api'
import type { Id } from '@shared/types'

type A = unknown

export interface SchoolAnalytics {
  totalStudents: number
  activeStudents: number
  attendanceRate: number
  academicAverage: number
  atRisk: number
  improving: number
  teachers: number
  mentors: number
  reportsPending: number
  reportCompletion: number
  performanceByClass: { className: string; average: number; students: number }[]
  attendanceTrend: { label: string; value: number }[]
}

export const analyticsService = {
  school: (_a: A, _orgId?: Id) => api.get<SchoolAnalytics>('/analytics/institution'),
  institution: (_a: A, _orgId?: Id) => api.get<SchoolAnalytics>('/analytics/institution'),
  studentProgress: (_a: A, id: Id) =>
    api.get<{ average: number; attendanceRate: number; bySubject: { label: string; value: number }[]; skills: string[] }>(`/students/${id}/progress`),
  platform: (_a: A) =>
    api.get<{
      activityByDay: { label: string; value: number }[]
      topActions: { action: string; count: number }[]
      totals: Record<string, number>
    }>('/analytics/platform'),
}
