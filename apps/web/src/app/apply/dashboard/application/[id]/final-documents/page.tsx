'use client'

import { Award, Download, Eye, Lock } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { EmptyState } from '../../../../../_study-work/components/EmptyState'
import { Button } from '../../../../../_study-work/components/FormControls'
import { getFinalDocuments } from '../../../../../_study-work/services/applicationService'

export default function FinalDocumentsTab() {
  const { application } = useApplicationDetailScope()
  if (!application) return null

  const isReady = application.status === 'APPROVED' || application.status === 'COMPLETED'

  if (!isReady) {
    return (
      <EmptyState
        icon={<Lock size={20} />}
        title="Not ready yet"
        body="Your completed document package will appear here once your application is approved."
      />
    )
  }

  // Final documents are only ever shown if they actually exist for this
  // application — nothing here is presented as available before it is real.
  const finalDocuments = getFinalDocuments(application.id)

  if (finalDocuments.length === 0) {
    return (
      <EmptyState
        icon={<Award size={20} />}
        title="Your documents are being prepared"
        body="Your application has been approved — your final document package will be published here shortly."
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black text-gray-900 dark:text-white">Your Completed Application Package</h2>
        <Button type="button" variant="secondary"><Download size={15} /> Download Complete Package</Button>
      </div>
      <div className="space-y-3">
        {finalDocuments.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{doc.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{doc.category} · issued {new Date(doc.issuedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="ghost"><Eye size={14} /> View</Button>
              <Button type="button" variant="secondary"><Download size={14} /> Download</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
