import { api } from '@/lib/api'
import type { Id, Notification, Role } from '@shared/types'

export const notificationService = {
  forUser: (_userId?: Id) => api.get<Notification[]>('/notifications'),
  unreadCount: async (_userId?: Id) => (await api.get<{ count: number }>('/notifications/unread-count')).count,
  markRead: (id: Id) => api.post(`/notifications/${id}/read`),
  markAllRead: (_userId?: Id) => api.post('/notifications/read-all'),
  remove: (id: Id) => api.del(`/notifications/${id}`),
  broadcast: (audience: Role | 'all', title: string, message: string) =>
    api.post<{ sent: number }>('/admin/broadcast', { audience, title, message }),
}
