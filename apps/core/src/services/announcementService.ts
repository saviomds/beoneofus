import { api } from '@/lib/api'
import type { Announcement, Id } from '@shared/types'

type A = unknown

export const announcementService = {
  feedFor: (_a: A) => api.get<Announcement[]>('/announcements'),
  authored: (_a: A) => api.get<Announcement[]>('/announcements/authored'),
  create: (_a: A, input: Record<string, unknown>) => api.post<Announcement>('/announcements', input),
  setPinned: (_a: A, id: Id, pinned: boolean) => api.post<Announcement>(`/announcements/${id}/pin`, { pinned }),
  remove: (_a: A, id: Id) => api.del(`/announcements/${id}`),
}
