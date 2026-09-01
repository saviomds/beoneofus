import { api } from '@/lib/api'
import type { Id, Page, Report, ReportStatus } from '@shared/types'

type A = unknown

async function rows(p: Promise<Page<Report> | Report[]>): Promise<Report[]> {
  const r = await p
  return Array.isArray(r) ? r : r.rows
}

export const reportService = {
  list: (_a: A, q: { organizationId?: Id; authorId?: Id; status?: ReportStatus } = {}) =>
    rows(api.get('/reports', q as Record<string, unknown>)),
  pendingReview: (_a: A) => api.get<Report[]>('/reports/pending'),
  get: (_a: A, id: Id) => api.get<Report>(`/reports/${id}`),
  create: (_a: A, input: Record<string, unknown>) => api.post<Report>('/reports', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Report>(`/reports/${id}`, patch),
  submit: (_a: A, id: Id) => api.post<Report>(`/reports/${id}/submit`),
  review: (_a: A, id: Id, decision: 'approved' | 'rejected' | 'under_review', note: string) =>
    api.post<Report>(`/reports/${id}/review`, { decision, note }),
}
