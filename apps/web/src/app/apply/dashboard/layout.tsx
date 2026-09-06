'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStudyWork } from '../../_study-work/state/StudyWorkContext'
import { PortalShell } from '../../_study-work/components/PortalShell'
import { LoadingState } from '../../_study-work/components/EmptyState'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useStudyWork()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/apply/dashboard')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><LoadingState label="Loading your portal…" /></div>
  }

  return <PortalShell>{children}</PortalShell>
}
