'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../services/authService'
import * as apps from '../services/applicationService'
import type {
  Application, ApplicationStatus, ApplicationType, ClientUser, RegisterInput,
} from '../types'

interface StudyWorkContextValue {
  loading: boolean
  user: ClientUser | null
  authSource: 'beoneofus' | 'mock' | null
  applications: Application[]
  refresh: () => void
  register: (input: RegisterInput) => Promise<ClientUser>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<ClientUser>) => void
  createApplication: (type: ApplicationType, overrideUser?: ClientUser) => Application
  saveDraft: (id: string, patch: Partial<Application>) => void
  submitApplication: (id: string) => void
  setDemoStatus: (id: string, status: ApplicationStatus) => void
}

const StudyWorkContext = createContext<StudyWorkContextValue | null>(null)

export function StudyWorkProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<ClientUser | null>(null)
  const [authSource, setAuthSource] = useState<'beoneofus' | 'mock' | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    auth.getCurrentUser().then((current) => {
      if (cancelled) return
      setUser(current?.user ?? null)
      setAuthSource(current?.source ?? null)
      setApplications(current ? apps.listApplicationsForUser(current.user.id) : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [tick])

  const register = useCallback(async (input: RegisterInput) => {
    const registered = await auth.register(input)
    // Set state synchronously from the result we already have, rather than
    // relying on the background refetch effect (triggered below via
    // `refresh`) — that round-trips through a Supabase session check and
    // would otherwise leave `user` stale for a moment, which broke
    // `createApplication` being called immediately after `register`.
    setUser(registered)
    setAuthSource('mock')
    setApplications(apps.listApplicationsForUser(registered.id))
    refresh()
    return registered
  }, [refresh])

  const logout = useCallback(async () => {
    await auth.logout()
    refresh()
  }, [refresh])

  const updateProfile = useCallback((patch: Partial<ClientUser>) => {
    if (!user || authSource !== 'mock') return
    auth.updateMockProfile(user.id, patch)
    refresh()
  }, [user, authSource, refresh])

  const createApplication = useCallback((type: ApplicationType, overrideUser?: ClientUser) => {
    // `overrideUser` lets a caller that just registered (and so already has
    // the freshly-created user in hand) skip the round-trip of waiting for
    // this context's own `user` state to catch up — avoids a stale-closure
    // race where the state update from `register()` hasn't landed yet.
    const effectiveUser = overrideUser ?? user
    if (!effectiveUser) throw new Error('Cannot create an application without a signed-in user')
    const created = apps.createApplication(effectiveUser.id, type, effectiveUser)
    refresh()
    return created
  }, [user, refresh])

  const saveDraft = useCallback((id: string, patch: Partial<Application>) => {
    apps.saveDraft(id, patch)
    refresh()
  }, [refresh])

  const submitApplication = useCallback((id: string) => {
    apps.submitApplication(id)
    refresh()
  }, [refresh])

  const setDemoStatus = useCallback((id: string, status: ApplicationStatus) => {
    apps.setStatus(id, status)
    refresh()
  }, [refresh])

  const value = useMemo<StudyWorkContextValue>(() => ({
    loading, user, authSource, applications, refresh,
    register, logout, updateProfile, createApplication, saveDraft, submitApplication, setDemoStatus,
  }), [loading, user, authSource, applications, refresh, register, logout, updateProfile, createApplication, saveDraft, submitApplication, setDemoStatus])

  return <StudyWorkContext.Provider value={value}>{children}</StudyWorkContext.Provider>
}

export function useStudyWork(): StudyWorkContextValue {
  const ctx = useContext(StudyWorkContext)
  if (!ctx) throw new Error('useStudyWork must be used within a StudyWorkProvider')
  return ctx
}
