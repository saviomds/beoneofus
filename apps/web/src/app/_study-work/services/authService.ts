// Auth for the Study/Work Abroad portal deliberately layers on top of the
// platform's REAL beoneofus account (Supabase) rather than inventing a second
// parallel login system: if someone already has a beoneofus account and is
// signed in, we use that session as-is and never show them a registration
// form. Only a brand-new visitor with no beoneofus session sees the detailed
// applicant registration form — and because there is no backend for this
// feature yet, that registration is mocked/local (see db.ts), ready to be
// swapped for a real endpoint later without touching the UI.

import { supabase } from '../../supabaseClient'
import { db, getStoredSessionUserId, setStoredSessionUserId } from './db'
import { newId } from './storage'
import type { ClientUser, RegisterInput } from '../types'

export interface CurrentUser {
  user: ClientUser
  source: 'beoneofus' | 'mock'
}

/** Real beoneofus session, if any — reused as-is, never re-created. */
async function getBeoneofusUser(): Promise<ClientUser | null> {
  try {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (!session?.user) return null
    const email = session.user.email ?? ''
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
    return {
      id: session.user.id,
      email,
      firstName: (meta.first_name as string) || (meta.full_name as string)?.split(' ')[0] || '',
      middleName: '',
      lastName: (meta.last_name as string) || '',
      phone: (meta.phone as string) || '',
      nationality: '',
      countryOfResidence: '',
      dateOfBirth: '',
      createdAt: session.user.created_at ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const beoneofusUser = await getBeoneofusUser()
  if (beoneofusUser) return { user: beoneofusUser, source: 'beoneofus' }

  const mockId = getStoredSessionUserId()
  if (mockId) {
    const found = db.users.all().find((u) => u.id === mockId)
    if (found) return { user: found, source: 'mock' }
  }
  return null
}

export async function register(input: RegisterInput): Promise<ClientUser> {
  const users = db.users.all()
  const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase())
  if (existing) {
    setStoredSessionUserId(existing.id)
    return existing
  }
  const user: ClientUser = {
    id: newId('user'),
    email: input.email,
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    phone: input.phone,
    nationality: input.nationality,
    countryOfResidence: input.countryOfResidence,
    dateOfBirth: input.dateOfBirth,
    createdAt: new Date().toISOString(),
  }
  db.users.save([...users, user])
  setStoredSessionUserId(user.id)
  return user
}

/** Only meaningful for a mock (portal-only) user — a real beoneofus account's
 * profile is edited on the main platform, not through this feature. */
export function updateMockProfile(userId: string, patch: Partial<ClientUser>): ClientUser | null {
  const users = db.users.all()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) return null
  const updated = { ...users[idx], ...patch }
  users[idx] = updated
  db.users.save(users)
  return updated
}

export async function logout(): Promise<void> {
  const current = await getCurrentUser()
  if (current?.source === 'beoneofus') {
    await supabase.auth.signOut()
  }
  setStoredSessionUserId(null)
}
