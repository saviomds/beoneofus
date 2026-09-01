import { api } from '@/lib/api'
import type { SafeUser } from '@shared/types'

export interface SearchHit {
  label: string
  sub: string
  href: string
  kind: string
}

export const searchService = {
  query: (_actor: SafeUser, q: string) => api.get<SearchHit[]>('/search', { q }),
}
