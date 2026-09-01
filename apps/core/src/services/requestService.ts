import { api } from '@/lib/api'
import type { GovRequest, Id, RequestStatus } from '@shared/types'

type A = unknown
type AdvanceAction =
  | 'received' | 'assign' | 'under_review' | 'need_information' | 'approved'
  | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export const requestService = {
  list: (_a: A, q: { schoolId?: Id; status?: RequestStatus; officerId?: Id } = {}) =>
    api.get<GovRequest[]>('/requests', q as Record<string, unknown>),
  get: (_a: A, id: Id) => api.get<GovRequest>(`/requests/${id}`),
  create: (_a: A, input: Record<string, unknown>) => api.post<GovRequest>('/requests', input),
  advance: (_a: A, id: Id, action: AdvanceAction, note: string, extra?: { officerId?: Id; response?: string }) =>
    api.post<GovRequest>(`/requests/${id}/advance`, { action, note, ...extra }),
  officers: (_a?: A) => api.get<{ id: Id; name: string }[]>('/requests/officers'),
  schoolName: async (id: Id): Promise<string> => {
    try {
      return (await api.get<{ officialName: string }>(`/organizations/${id}`)).officialName
    } catch {
      return id
    }
  },
}
