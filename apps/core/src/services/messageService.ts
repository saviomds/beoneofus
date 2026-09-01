import { api } from '@/lib/api'
import type { Conversation, Id, Message, Role, SafeUser } from '@shared/types'

type A = unknown

export interface ConversationView extends Conversation {
  others: SafeUser[]
  unread: number
  last: Message | null
}

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
  if (['student', 'teacher', 'mentor'].includes(a.role) && ['student', 'teacher', 'mentor', 'school'].includes(b.role)) {
    return a.organizationId === b.organizationId
  }
  return true
}

export const messageService = {
  contactsFor: (_a: A) => api.get<SafeUser[]>('/messages/contacts'),
  conversations: (_a: A) => api.get<ConversationView[]>('/messages/conversations'),
  thread: (_a: A, id: Id) => api.get<Message[]>(`/messages/conversations/${id}`),
  startConversation: (_a: A, recipientId: Id, subject: string, body: string) =>
    api.post<Conversation>('/messages/conversations', { recipientId, subject, body }),
  send: (_a: A, id: Id, body: string) => api.post<Message>(`/messages/conversations/${id}`, { body }),
}
