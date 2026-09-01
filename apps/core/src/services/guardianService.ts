import { api } from '@/lib/api'
import type {
  Announcement, Assessment, AttendanceRecord, GuardianLink, GuardianRelationship, Id, RecordType,
  ReportCard, SafeUser, Student,
} from '@shared/types'

type A = unknown

export interface ChildSummary {
  link: GuardianLink
  student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'gradeLevel' | 'institutionStudentNumber'>
  organizationName: string
  attendanceRate: number
  latestReportCard: { id: Id; term: string; gpa: number } | null
  openConcerns: number
}

export interface ChildOverview {
  student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'gradeLevel' | 'program' | 'institutionStudentNumber'>
  organizationName: string
  relationship: GuardianRelationship
  assessments: Assessment[]
  attendance: AttendanceRecord[]
  attendanceRate: number
  reportCards: ReportCard[]
  announcements: Announcement[]
}

export const guardianService = {
  // portal
  myChildren: (_a?: A) => api.get<ChildSummary[]>('/guardian/children'),
  childOverview: (_a: A, studentId: Id) => api.get<ChildOverview>(`/guardian/children/${studentId}`),
  requestExcuse: (_a: A, attendanceId: Id, reason: string) =>
    api.post<AttendanceRecord>(`/guardian/attendance/${attendanceId}/excuse`, { reason }),
  // school-side link management
  links: (_a: A, q: { studentId?: Id } = {}) =>
    api.get<(GuardianLink & { guardianName: string; studentName: string })[]>('/guardians/links', q as Record<string, unknown>),
  linkGuardian: (_a: A, input: {
    studentId: Id; guardianCode?: string; name?: string; email?: string; phone?: string
    relationship: GuardianRelationship; canViewRecordTypes?: RecordType[]; isPrimary?: boolean
  }) => api.post<{ link: GuardianLink; guardian: SafeUser; created: boolean; guardianCode: string }>('/guardians/links', input),
  updateLink: (_a: A, id: Id, patch: { canViewRecordTypes?: RecordType[]; relationship?: GuardianRelationship; isPrimary?: boolean }) =>
    api.patch<GuardianLink>(`/guardians/links/${id}`, patch),
  revokeLink: (_a: A, id: Id) => api.post(`/guardians/links/${id}/revoke`),
}
