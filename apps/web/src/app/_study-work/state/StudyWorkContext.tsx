'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../services/authService'
import * as apps from '../services/applicationService'
import type { Application, ApplicationType, ClientUser } from '../types'

interface StudyWorkContextValue {
  loading: boolean
  user: ClientUser | null
  hasApplicantProfile: boolean
  applications: Application[]
  refresh: () => void
  saveApplicantDetails: (input: auth.ApplicantDetailsInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<ClientUser>) => Promise<void>
  createApplication: (type: ApplicationType) => Promise<Application>
  saveDraft: (id: string, patch: Partial<Application>) => Promise<void>
  submitApplication: (id: string) => Promise<void>
}

const StudyWorkContext = createContext<StudyWorkContextValue | null>(null)

export function StudyWorkProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<ClientUser | null>(null)
  const [hasApplicantProfile, setHasApplicantProfile] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    auth.getCurrentUser().then(async (current) => {
      if (cancelled) return
      setUser(current?.user ?? null)
      setHasApplicantProfile(current?.hasApplicantProfile ?? false)
      const list = current ? await apps.listApplicationsForUser(current.user.id) : []
      if (cancelled) return
      setApplications(list)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [tick])

  const logout = useCallback(async () => {
    await auth.logout()
    refresh()
  }, [refresh])

  const saveApplicantDetails = useCallback(async (input: auth.ApplicantDetailsInput) => {
    if (!user) throw new Error('Not signed in')
    await auth.saveApplicantDetails(user.id, user.email, input)
    refresh()
  }, [user, refresh])

  const updateProfile = useCallback(async (patch: Partial<ClientUser>) => {
    if (!user) return
    await auth.saveApplicantDetails(user.id, user.email, {
      firstName: patch.firstName ?? user.firstName,
      middleName: patch.middleName ?? user.middleName,
      lastName: patch.lastName ?? user.lastName,
      phone: patch.phone ?? user.phone,
      nationality: patch.nationality ?? user.nationality,
      countryOfResidence: patch.countryOfResidence ?? user.countryOfResidence,
      dateOfBirth: patch.dateOfBirth ?? user.dateOfBirth,
    })
    refresh()
  }, [user, refresh])

  const createApplication = useCallback(async (type: ApplicationType) => {
    if (!user) throw new Error('Cannot create an application without a signed-in user')
    const created = await apps.createApplication(user.id, type, user)
    refresh()
    return created
  }, [user, refresh])

  const saveDraft = useCallback(async (id: string, patch: Partial<Application>) => {
    await apps.saveDraft(id, patch)
    refresh()
  }, [refresh])

  const submitApplication = useCallback(async (id: string) => {
    await apps.submitApplication(id)
    refresh()
  }, [refresh])

  const value = useMemo<StudyWorkContextValue>(() => ({
    loading, user, hasApplicantProfile, applications, refresh,
    saveApplicantDetails, logout, updateProfile, createApplication, saveDraft, submitApplication,
  }), [loading, user, hasApplicantProfile, applications, refresh, saveApplicantDetails, logout, updateProfile, createApplication, saveDraft, submitApplication])

  return <StudyWorkContext.Provider value={value}>{children}</StudyWorkContext.Provider>
}

export function useStudyWork(): StudyWorkContextValue {
  const ctx = useContext(StudyWorkContext)
  if (!ctx) throw new Error('useStudyWork must be used within a StudyWorkProvider')
  return ctx
}
