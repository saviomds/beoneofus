import { notificationsRepo } from '../lib/db'
import type { Id, Notification } from '@shared/types'

type NewNotification = Pick<Notification, 'recipientId' | 'type' | 'title' | 'message'> &
  Partial<Pick<Notification, 'actionUrl' | 'organizationId'>>

const sort = (rows: Notification[]) => [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

export const notificationService = {
  async create(input: NewNotification): Promise<Notification> {
    return notificationsRepo.create({
      recipientId: input.recipientId,
      organizationId: input.organizationId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      actionUrl: input.actionUrl ?? null,
    }) as Promise<Notification>
  },

  async createMany(inputs: NewNotification[]): Promise<void> {
    for (const input of inputs) await this.create(input)
  },

  async forUser(userId: Id): Promise<Notification[]> {
    return sort((await notificationsRepo.list({ recipientId: userId })) as Notification[])
  },

  async unreadCount(userId: Id): Promise<number> {
    return (await this.forUser(userId)).filter((n) => !n.read).length
  },

  async markRead(id: Id, actorId: Id): Promise<Notification> {
    return notificationsRepo.update(id, { read: true }, { actorId }) as Promise<Notification>
  },

  async markAllRead(userId: Id): Promise<void> {
    for (const n of await this.forUser(userId)) {
      if (!n.read) await notificationsRepo.update(n.id, { read: true }, { actorId: userId })
    }
  },

  async remove(id: Id, actorId: Id): Promise<void> {
    await notificationsRepo.remove(id, actorId)
  },
}
