import { api } from '@/lib/api'
import type { Id, OrgStatus, Organization } from '@shared/types'

type A = unknown

export const organizationService = {
  list: (_a?: A) => api.get<Organization[]>('/organizations'),
  mine: (_a?: A) => api.get<Organization | null>('/organizations/mine'),
  get: (_a: A, id: Id) => api.get<Organization>(`/organizations/${id}`),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Organization>(`/organizations/${id}`, patch),
  setStatus: (_a: A, id: Id, status: OrgStatus, note = '') =>
    api.post<Organization>(`/organizations/${id}/status`, { status, note }),
  create: (_a: A, input: Record<string, unknown>) => api.post<Organization>('/admin/organizations', input),
}
