import { api } from '@/lib/api'
import type {
  Assessment, AssessmentComponent, AssessmentScheme, EducationStructureKey, GradeBand, Id, ReportCard,
} from '@shared/types'

type A = unknown

export interface TranscriptView {
  student: { id: Id; name: string; number: string }
  terms: {
    academicYear: string; term: string; organizationId: Id; classId: Id | null
    subjects: { subjectName: string; score: number | null; grade: string }[]
    gpa: number | null; average: number | null; position: number | null
  }[]
  cumulativeGpa: number
  credentialsCount: number
}

export interface AssessmentInput {
  studentId: Id; subjectId: Id; subjectName?: string; classId?: Id | null
  academicYear: string; term: string; componentKey: string; title: string
  score: number; maxScore?: number; date?: string; comment?: string
}

export const academicService = {
  schemes: (_a?: A) => api.get<AssessmentScheme[]>('/academic/schemes'),
  createScheme: (_a: A, input: { name: string; level: EducationStructureKey; components: AssessmentComponent[]; gradeBands?: GradeBand[]; passMark?: number; isDefault?: boolean }) =>
    api.post<AssessmentScheme>('/academic/schemes', input),
  updateScheme: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<AssessmentScheme>(`/academic/schemes/${id}`, patch),

  assessments: (_a: A, q: { studentId?: Id; classId?: Id; subjectId?: Id; term?: string } = {}) =>
    api.get<Assessment[]>('/assessments', q as Record<string, unknown>),
  recordAssessment: (_a: A, input: AssessmentInput) => api.post<Assessment>('/assessments', input),
  bulkRecordAssessments: (_a: A, entries: AssessmentInput[]) => api.post<{ saved: number }>('/assessments/bulk', { entries }),

  computeReportCard: (_a: A, input: { studentId: Id; classId: Id; term: string; academicYear: string }) =>
    api.post<ReportCard>('/report-cards/compute', input),
  generateReportCards: (_a: A, input: { classId: Id; term: string; academicYear: string }) =>
    api.post<{ created: number; updated: number }>('/report-cards/generate', input),
  reportCards: (_a: A, q: { classId?: Id; term?: string; status?: ReportCard['status']; studentId?: Id } = {}) =>
    (q.studentId ? api.get<ReportCard[]>(`/students/${q.studentId}/report-cards`) : api.get<ReportCard[]>('/report-cards', q as Record<string, unknown>)),
  getReportCard: (_a: A, id: Id) => api.get<ReportCard>(`/report-cards/${id}`),
  updateReportCard: (_a: A, id: Id, patch: { conduct?: string; headTeacherRemark?: string }) => api.patch<ReportCard>(`/report-cards/${id}`, patch),
  publishReportCard: (_a: A, id: Id) => api.post<ReportCard>(`/report-cards/${id}/publish`),

  transcript: (_a: A, studentId: Id) => api.get<TranscriptView>(`/students/${studentId}/transcript`),
}
