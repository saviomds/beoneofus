import { api } from '@/lib/api'
import type { Id, TransferRequest } from '@shared/types'

type A = unknown

export const transferService = {
  list: (_a: A) => api.get<{ outgoing: TransferRequest[]; incoming: TransferRequest[]; all: TransferRequest[] }>('/transfers'),
  destinations: (_a: A) => api.get<{ id: Id; name: string }[]>('/transfers/destinations'),
  initiate: (_a: A, input: Record<string, unknown>) => api.post<TransferRequest>('/transfers', input),
  advance: (_a: A, id: Id, action: 'approve' | 'reject' | 'accept' | 'cancel', note = '') =>
    api.post<TransferRequest>(`/transfers/${id}/${action}`, { note }),
}
