import { conversationsRepo, messagesRepo, usersRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService, notificationService } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { toSafeUser } from './authService'
import type { Conversation, Id, Message, Role, SafeUser, User } from '@shared/types'

const CONTACT: Record<Role, Role[]> = {
  student: ['teacher', 'mentor', 'school'],
  teacher: ['student', 'mentor', 'guardian', 'school'],
  mentor: ['student', 'teacher', 'school'],
  guardian: ['teacher', 'school'],
  school: ['teacher', 'mentor', 'student', 'guardian', 'government'],
  government: ['school'],
  admin: ['student', 'teacher', 'mentor', 'guardian', 'school', 'government', 'admin'],
}

export function canMessage(a: SafeUser, b: SafeUser): boolean {
  if (a.role === 'admin') return true
  if (!CONTACT[a.role]?.includes(b.role)) return false
  // same-institution constraint for intra-org roles
  if (['student', 'teacher', 'mentor'].includes(a.role) && ['student', 'teacher', 'mentor', 'school'].includes(b.role)) {
    return a.organizationId === b.organizationId
  }
  return true
}

export const messageService = {
  async contactsFor(actor: SafeUser): Promise<SafeUser[]> {
    assertPermission(actor, P.MESSAGES_USE)
    const all = ((await usersRepo.list()) as User[]).map(toSafeUser)
    return all.filter((u) => u.id !== actor.id && u.status === 'active' && canMessage(actor, u))
  },

  async conversations(actor: SafeUser) {
    assertPermission(actor, P.MESSAGES_USE)
    const convs = ((await conversationsRepo.list()) as Conversation[]).filter((c) => c.participantIds.includes(actor.id))
    const allUsers = ((await usersRepo.list()) as User[]).map(toSafeUser)
    const out = []
    for (const c of convs) {
      const msgs = ((await messagesRepo.list({ conversationId: c.id })) as Message[]).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      out.push({
        ...c,
        others: allUsers.filter((u) => c.participantIds.includes(u.id) && u.id !== actor.id),
        unread: msgs.filter((m) => m.senderId !== actor.id && !m.readBy.includes(actor.id)).length,
        last: msgs[msgs.length - 1] ?? null,
      })
    }
    return out.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1))
  },

  async thread(actor: SafeUser, conversationId: Id): Promise<Message[]> {
    assertPermission(actor, P.MESSAGES_USE)
    const conv = (await conversationsRepo.get(conversationId)) as Conversation | null
    if (!conv || !conv.participantIds.includes(actor.id)) return []
    const msgs = ((await messagesRepo.list({ conversationId })) as Message[]).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    for (const m of msgs) {
      if (m.senderId !== actor.id && !m.readBy.includes(actor.id)) {
        await messagesRepo.update(m.id, { readBy: [...m.readBy, actor.id] }, { actorId: actor.id })
      }
    }
    return msgs
  },

  async startConversation(actor: SafeUser, recipientId: Id, subject: string, body: string): Promise<Conversation> {
    assertPermission(actor, P.MESSAGES_USE)
    const recipient = (await usersRepo.get(recipientId)) as User | null
    if (!recipient || !canMessage(actor, toSafeUser(recipient))) throw new ValidationError('You are not permitted to message this person.')
    const existing = ((await conversationsRepo.list()) as Conversation[]).find(
      (c) => c.participantIds.length === 2 && c.participantIds.includes(actor.id) && c.participantIds.includes(recipientId),
    )
    const conv = existing ?? ((await conversationsRepo.create({
      participantIds: [actor.id, recipientId], organizationId: actor.organizationId, subject, lastMessageAt: new Date().toISOString(),
    }, actor.id)) as Conversation)
    await this.send(actor, conv.id, body)
    return conv
  },

  async send(actor: SafeUser, conversationId: Id, body: string): Promise<Message> {
    assertPermission(actor, P.MESSAGES_USE)
    const conv = (await conversationsRepo.get(conversationId)) as Conversation | null
    if (!conv || !conv.participantIds.includes(actor.id)) throw new NotFoundError('Conversation')
    const msg = (await messagesRepo.create({ conversationId, senderId: actor.id, body, readBy: [actor.id], attachments: [] }, actor.id)) as Message
    await conversationsRepo.update(conversationId, { lastMessageAt: new Date().toISOString() }, { actorId: actor.id })
    await auditService.record({ actor, action: 'MESSAGE_SENT', targetId: conversationId, targetType: 'conversation', organizationId: actor.organizationId })
    for (const pid of conv.participantIds) {
      if (pid === actor.id) continue
      await notificationService.create({ recipientId: pid, type: 'message', title: `New message from ${actor.name}`, message: body.slice(0, 90), actionUrl: '/messages' })
    }
    return msg
  },
}
