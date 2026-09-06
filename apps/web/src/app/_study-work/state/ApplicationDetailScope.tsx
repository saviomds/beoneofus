'use client'

import { createContext, useContext } from 'react'
import { useApplicationDetail } from '../hooks/useApplicationDetail'

type ApplicationDetailValue = ReturnType<typeof useApplicationDetail>

const ApplicationDetailContext = createContext<ApplicationDetailValue | null>(null)

/** Loads one application's full detail (requirements, documents, timeline,
 * messages) once per application-detail layout, and shares it across all tab
 * pages beneath it — avoiding a duplicate fetch/subscribe per tab. */
export function ApplicationDetailScope({ applicationId, children }: { applicationId: string; children: React.ReactNode }) {
  const value = useApplicationDetail(applicationId)
  return <ApplicationDetailContext.Provider value={value}>{children}</ApplicationDetailContext.Provider>
}

export function useApplicationDetailScope(): ApplicationDetailValue {
  const ctx = useContext(ApplicationDetailContext)
  if (!ctx) throw new Error('useApplicationDetailScope must be used within an ApplicationDetailScope')
  return ctx
}
