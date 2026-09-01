import { api } from '@/lib/api'
import type { Campaign, CampaignField, CampaignSubmission, Id, OrganizationType } from '@shared/types'

type A = unknown

export interface CampaignDashboard {
  campaign: Campaign
  totals: Record<CampaignSubmission['status'], number>
  assigned: number
  completionPct: number
  overdue: number
}

export const campaignService = {
  list: (_a?: A) => api.get<Campaign[]>('/campaigns'),
  get: (_a: A, id: Id) => api.get<Campaign>(`/campaigns/${id}`),
  create: (_a: A, input: { title: string; description?: string; fields: Partial<CampaignField>[]; audienceOrganizationTypes?: OrganizationType[]; opensAt?: string; dueAt: string }) =>
    api.post<Campaign>('/campaigns', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Campaign>(`/campaigns/${id}`, patch),
  publish: (_a: A, id: Id) => api.post<Campaign>(`/campaigns/${id}/publish`),
  close: (_a: A, id: Id) => api.post<Campaign>(`/campaigns/${id}/close`),
  dashboard: (_a: A, id: Id) => api.get<CampaignDashboard>(`/campaigns/${id}/dashboard`),
  submissions: (_a: A, id: Id) => api.get<(CampaignSubmission & { organizationName: string })[]>(`/campaigns/${id}/submissions`),
  reviewSubmission: (_a: A, submissionId: Id, decision: 'approve' | 'return', note = '') =>
    api.post<CampaignSubmission>(`/campaign-submissions/${submissionId}/review`, { decision, note }),
  // institution side
  submissionFor: (_a: A, id: Id) => api.get<{ campaign: Campaign; submission: CampaignSubmission }>(`/campaigns/${id}/submission`),
  saveSubmission: (_a: A, id: Id, data: Record<string, unknown>) => api.put<CampaignSubmission>(`/campaigns/${id}/submission`, { data }),
  submit: (_a: A, id: Id) => api.post<CampaignSubmission>(`/campaigns/${id}/submit`),
}
