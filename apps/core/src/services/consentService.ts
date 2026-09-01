import { api } from '@/lib/api'
import type { Consent, Id, RecordType } from '@shared/types'

type A = unknown

export const consentService = {
  list: (_a?: A) => api.get<Consent[]>('/consents'),
  get: (_a: A, id: Id) => api.get<Consent>(`/consents/${id}`),
  record: (
    _a: A,
    input: {
      studentId: Id
      requestingOrganizationId: Id
      scopeRecordTypes: RecordType[]
      grantedByName: string
      grantedByRelationship: Consent['grantedByRelationship']
      purpose: string
      legalBasis: string
      requestId?: Id | null
      expiresAt?: string | null
    },
  ) => api.post<Consent>('/consents', input),
  withdraw: (_a: A, id: Id, note = '') => api.post<Consent>(`/consents/${id}/withdraw`, { note }),
}
