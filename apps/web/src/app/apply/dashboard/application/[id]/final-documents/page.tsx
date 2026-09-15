'use client'

import { useState } from 'react'
import { Award, Download, Eye, Loader2, Lock } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { EmptyState } from '../../../../../_study-work/components/EmptyState'
import { Button } from '../../../../../_study-work/components/FormControls'
import { getDocumentSignedUrl } from '../../../../../_study-work/services/applicationService'
import type { FinalDocument } from '../../../../../_study-work/types'

export default function FinalDocumentsTab() {
  const { application, finalDocuments } = useApplicationDetailScope()
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
      <h2 className="font-black text-gray-900 dark:text-white mb-5">Your Completed Application Package</h2>
      <div className="space-y-3">
        {finalDocuments.map((doc) => (
          <FinalDocumentRow key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  )
}

function FinalDocumentRow({ doc }: { doc: FinalDocument }) {
  const [busyAction, setBusyAction] = useState<'view' | 'download' | null>(null)
  const [error, setError] = useState('')

  async function open(download: boolean) {
    setBusyAction(download ? 'download' : 'view')
    setError('')
    try {
      const url = await getDocumentSignedUrl(doc.fileName, download)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this document.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="min-w-0">
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{doc.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{doc.category} · issued {new Date(doc.issuedAt).toLocaleDateString()}</p>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button type="button" variant="ghost" onClick={() => open(false)} disabled={busyAction !== null}>
          {busyAction === 'view' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} View
        </Button>
        <Button type="button" variant="secondary" onClick={() => open(true)} disabled={busyAction !== null}>
          {busyAction === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
        </Button>
      </div>
    </div>
  )
}
