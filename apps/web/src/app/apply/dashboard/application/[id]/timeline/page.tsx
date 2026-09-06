'use client'

import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { Timeline } from '../../../../../_study-work/components/Timeline'

export default function TimelineTab() {
  const { timeline } = useApplicationDetailScope()
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <Timeline events={timeline} />
    </div>
  )
}
