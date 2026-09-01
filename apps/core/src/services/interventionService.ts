import { api } from '@/lib/api'
import type { Id, Intervention, InterventionKind, InterventionStatus } from '@shared/types'

type A = unknown

export const interventionService = {
  list: (_a: A, q: { studentId?: Id; status?: InterventionStatus; kind?: InterventionKind } = {}) =>
    api.get<Intervention[]>('/interventions', q as Record<string, unknown>),
  get: (_a: A, id: Id) => api.get<Intervention>(`/interventions/${id}`),
  open: (_a: A, input: { studentId: Id; kind: InterventionKind; reason: string; assignedTo?: Id | null }) =>
    api.post<Intervention>('/interventions', input),
  advance: (_a: A, id: Id, patch: { status?: InterventionStatus; assignedTo?: Id | null; note?: string }) =>
    api.post<Intervention>(`/interventions/${id}/advance`, patch),
}
