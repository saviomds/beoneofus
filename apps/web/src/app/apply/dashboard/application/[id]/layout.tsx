'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ApplicationDetailScope, useApplicationDetailScope } from '../../../../_study-work/state/ApplicationDetailScope'
import { ApplicationHeader, ApplicationTabs } from '../../../../_study-work/components/ApplicationTabs'
import { LoadingState, ErrorState } from '../../../../_study-work/components/EmptyState'

function ApplicationDetailInner({ children }: { children: React.ReactNode }) {
  const { application, loading } = useApplicationDetailScope()

  if (loading) return <LoadingState label="Loading application…" />
  if (!application) {
    return (
      <div>
        <ErrorState title="Application not found" body="We couldn't find this application." />
        <div className="text-center"><Link href="/apply/dashboard" className="text-sm font-bold text-blue-600 hover:underline">Back to dashboard</Link></div>
      </div>
    )
  }

  return (
    <div>
      <ApplicationHeader application={application} />
      <ApplicationTabs applicationId={application.id} />
      {children}
    </div>
  )
}

export default function ApplicationDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  return (
    <ApplicationDetailScope applicationId={params.id}>
      <ApplicationDetailInner>{children}</ApplicationDetailInner>
    </ApplicationDetailScope>
  )
}
