'use client'

import { FolderOpen, Lock } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { DocumentCard } from '../../../../../_study-work/components/DocumentCard'
import { EmptyState } from '../../../../../_study-work/components/EmptyState'
import { isConfirmedOrLater } from '../../../../../_study-work/lib/statusMachine'

export default function DocumentsTab() {
  const { application, documents, uploadDocument } = useApplicationDetailScope()
  if (!application) return null

  if (!isConfirmedOrLater(application.status)) {
    return (
      <EmptyState
        icon={<Lock size={20} />}
        title="Documents not available yet"
        body="You'll be able to upload documents once your application is confirmed."
      />
    )
  }

  if (documents.length === 0) {
    return <EmptyState icon={<FolderOpen size={20} />} title="No documents yet" body="Documents will appear here once your requirements are published." />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} onUploaded={(fileName) => uploadDocument(doc.id, fileName)} />
      ))}
    </div>
  )
}
