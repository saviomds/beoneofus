import { readJSON, writeJSON } from './storage'
import { syncCollection } from './remoteSync'
import * as seed from '../mock/seed'
import type {
  Application, Requirement, DocumentItem, Conversation, Message,
  NotificationItem, TimelineEvent, FinalDocument, ClientUser,
} from '../types'

// Lazily-seeded local "database". Each collection is read from localStorage on
// first access; if nothing is there yet, the seed data is written in and
// returned. This is the only module that touches storage.ts directly — every
// other service goes through the getters/setters below.
//
// Every save() also mirrors the full collection into real Supabase storage
// (see remoteSync.ts) so the admin dashboard has real data to manage, without
// making any of this module — or its ~30 synchronous callers — async.

function collection<T>(name: string, seedValue: T[]): { all: () => T[]; save: (rows: T[]) => void } {
  return {
    all: () => readJSON<T[]>(name, seedValue),
    save: (rows: T[]) => {
      writeJSON(name, rows)
      syncCollection(name, rows)
    },
  }
}

const applications = collection<Application>('applications', seed.SEED_APPLICATIONS)
const requirements = collection<Requirement>('requirements', seed.SEED_REQUIREMENTS)
const documents = collection<DocumentItem>('documents', seed.SEED_DOCUMENTS)
const conversations = collection<Conversation>('conversations', seed.SEED_CONVERSATIONS)
const messages = collection<Message>('messages', seed.SEED_MESSAGES)
const notifications = collection<NotificationItem>('notifications', seed.SEED_NOTIFICATIONS)
const timeline = collection<TimelineEvent>('timeline', seed.SEED_TIMELINE)
const finalDocuments = collection<FinalDocument>('finalDocuments', seed.SEED_FINAL_DOCUMENTS)
const users = collection<ClientUser>('users', [seed.DEMO_USER])

export const db = {
  applications,
  requirements,
  documents,
  conversations,
  messages,
  notifications,
  timeline,
  finalDocuments,
  users,
}

// One-shot mirror on load so the admin dashboard has something to manage even
// before this browser makes its first write — e.g. the seeded demo
// applicant, or a returning applicant's previously-saved data.
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    for (const [name, col] of Object.entries(db)) syncCollection(name, col.all())
  }, 0)
}

const SESSION_KEY = 'session'

export function getStoredSessionUserId(): string | null {
  return readJSON<string | null>(SESSION_KEY, null)
}

export function setStoredSessionUserId(userId: string | null): void {
  writeJSON(SESSION_KEY, userId)
}
