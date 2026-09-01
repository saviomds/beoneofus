import { api } from '@/lib/api'
import type { EducationStructureKey, Id, Invitation, Organization, OrganizationType } from '@shared/types'

type A = unknown

export interface PublicInvitation {
  id: Id
  organizationName: string
  organizationType: OrganizationType
  institutionLevels: EducationStructureKey[]
  recipientName: string
  recipientEmail: string
  expiresAt: string
  status: Invitation['status']
}

export const invitationService = {
  list: (_a?: A) => api.get<Invitation[]>('/invitations'),
  create: (_a: A, input: Record<string, unknown>) =>
    api.post<{ invitation: Invitation; token: string; link: string }>('/invitations', input),
  revoke: (_a: A, id: Id) => api.post(`/invitations/${id}/revoke`),
  // public
  getByToken: (token: string) => api.get<PublicInvitation | null>(`/invite/${encodeURIComponent(token)}`),
  accept: (token: string, input: Record<string, unknown>) =>
    api.post<{ organization: Organization; adminCode: string }>(`/invite/${encodeURIComponent(token)}/accept`, input),
}
