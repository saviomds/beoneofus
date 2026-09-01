import { api } from '@/lib/api'
import type { Id, RecordRequest, RecordType } from '@shared/types'

type A = unknown

export const recordRequestService = {
  list: (_a?: A) =>
    api.get<{ outgoing: RecordRequest[]; incoming: RecordRequest[]; all: RecordRequest[] }>('/record-requests'),
  sources: (_a?: A) => api.get<{ id: Id; name: string }[]>('/record-requests/sources'),
  get: (_a: A, id: Id) => api.get<RecordRequest>(`/record-requests/${id}`),
  create: (_a: A, input: { studentId: Id; sourceOrganizationId: Id; requestedRecordTypes: RecordType[]; purpose: string; legalBasis: string }) =>
    api.post<RecordRequest>('/record-requests', input),
  review: (
    _a: A,
    id: Id,
    decision: 'approve' | 'partial' | 'reject' | 'need_info',
    input: { approvedRecordTypes?: RecordType[]; consentId?: Id | null; legalBasis?: string; note?: string; expiresInDays?: number } = {},
  ) => api.post<RecordRequest>(`/record-requests/${id}/review`, { decision, ...input }),
  revoke: (_a: A, id: Id, note = '') => api.post<RecordRequest>(`/record-requests/${id}/revoke`, { note }),
}
