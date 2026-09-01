import { api } from '@/lib/api'
import type { Credential, Id } from '@shared/types'

type A = unknown

export interface PublicCredentialResult {
  valid: boolean
  status?: Credential['status']
  credentialTitle?: string
  credentialType?: Credential['type']
  holderName?: string
  issuerName?: string
  issuedDate?: string
  verificationCode?: string
}

export const credentialService = {
  listForOrg: (_a?: A) => api.get<Credential[]>('/credentials'),
  issue: (_a: A, input: { studentId: Id; title: string; type: Credential['type']; issuedDate?: string }) =>
    api.post<Credential>('/credentials', input),
  revoke: (_a: A, id: Id, reason = '') => api.post<Credential>(`/credentials/${id}/revoke`, { reason }),
  // public — no auth
  verify: (code: string) => api.get<PublicCredentialResult>(`/verify/${encodeURIComponent(code)}`),
}
