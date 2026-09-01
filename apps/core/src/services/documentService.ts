import { api } from '@/lib/api'
import type { DocumentRecord, DocumentStatus, Id } from '@shared/types'

type A = unknown

export const documentService = {
  forOwner: (_a: A, ownerId: Id) => api.get<DocumentRecord[]>('/documents', { ownerId }),
  forOrganization: (_a: A, _orgId?: Id) => api.get<DocumentRecord[]>('/documents'),
  register: (_a: A, input: Record<string, unknown>) => api.post<DocumentRecord>('/documents', input),
  setStatus: (_a: A, id: Id, status: DocumentStatus) => api.post<DocumentRecord>(`/documents/${id}/status`, { status }),
  remove: (_a: A, id: Id) => api.del(`/documents/${id}`),
}
