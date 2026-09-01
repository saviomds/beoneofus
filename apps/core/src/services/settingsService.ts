import { api } from '@/lib/api'
import type { SafeUser, SettingsRecord } from '@shared/types'

export const settingsService = {
  forActor: (_actor?: SafeUser) => api.get<SettingsRecord>('/settings'),
  save: (_actor: SafeUser | undefined, values: Record<string, unknown>) =>
    api.put<SettingsRecord>('/settings', { values }),
}
