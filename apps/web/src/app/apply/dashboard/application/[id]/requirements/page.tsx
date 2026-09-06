'use client'

import { ClipboardList, Lock } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { RequirementCard } from '../../../../../_study-work/components/RequirementCard'
import { EmptyState } from '../../../../../_study-work/components/EmptyState'
import { isConfirmedOrLater } from '../../../../../_study-work/lib/statusMachine'

export default function RequirementsTab() {
  const { application, requirements } = useApplicationDetailScope()
  if (!application) return null

  if (!isConfirmedOrLater(application.status)) {
    return (
      <EmptyState
        icon={<Lock size={20} />}
        title="Requirements not available yet"
        body="Your personalized requirements will appear here once your application is confirmed."
      />
    )
  }

  if (requirements.length === 0) {
    return <EmptyState icon={<ClipboardList size={20} />} title="No requirements yet" body="Your advisor hasn't published requirements for this application yet." />
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Requirements can vary based on your program, employer, nationality, and application category. This list is
        specific to your application.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {requirements.map((r) => <RequirementCard key={r.id} requirement={r} />)}
      </div>
    </div>
  )
}
