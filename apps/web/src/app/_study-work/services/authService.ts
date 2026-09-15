// Identity for the Study/Work Abroad portal is the platform's one real
// beoneofus account (Supabase auth) — there is no separate/mock identity
// system. A signed-in user's applicant-specific fields (phone, nationality,
// country of residence, date of birth, plus name if the base account only
// has a username) live in `study_work_applicant_profiles`, completed via
// /apply/details the first time someone applies.
import { supabase } from '../../supabaseClient'
import type { ClientUser } from '../types'

export interface CurrentUser {
  user: ClientUser
  hasApplicantProfile: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await supabase.auth.getSession()
  const session = data?.session
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('study_work_applicant_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
  const fullNameParts = ((meta.full_name as string) || (meta.username as string) || '').trim().split(/\s+/).filter(Boolean)

  const user: ClientUser = {
    id: session.user.id,
    email: session.user.email ?? '',
    firstName: profile?.first_name || (meta.first_name as string) || fullNameParts[0] || '',
    middleName: profile?.middle_name || '',
    lastName: profile?.last_name || (meta.last_name as string) || (fullNameParts.length > 1 ? fullNameParts.slice(1).join(' ') : ''),
    phone: profile?.phone || session.user.phone || '',
    nationality: profile?.nationality || '',
    countryOfResidence: profile?.country_of_residence || '',
    dateOfBirth: profile?.date_of_birth || '',
    createdAt: session.user.created_at ?? new Date().toISOString(),
  }

  return { user, hasApplicantProfile: !!profile }
}

export interface ApplicantDetailsInput {
  firstName: string
  middleName: string
  lastName: string
  phone: string
  nationality: string
  countryOfResidence: string
  dateOfBirth: string
}

export async function saveApplicantDetails(userId: string, email: string, input: ApplicantDetailsInput): Promise<void> {
  const { error } = await supabase.from('study_work_applicant_profiles').upsert({
    user_id: userId,
    email,
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    phone: input.phone,
    nationality: input.nationality,
    country_of_residence: input.countryOfResidence,
    date_of_birth: input.dateOfBirth,
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}
