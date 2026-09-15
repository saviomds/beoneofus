'use client'

import { useState } from 'react'
import { FileText, MessageSquareWarning, Eye, Loader2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { FileUpload } from './FileUpload'
import { DOCUMENT_STATUS_LABEL, documentTone } from '../lib/statusMachine'
import type { DocumentItem } from '../types'

interface DocumentCardProps {
  document: DocumentItem
  onUpload: (file: File) => Promise<void>
  onView: () => Promise<string | null>
}

export function DocumentCard({ document, onUpload, onView }: DocumentCardProps) {
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(false)
  const hasFile = document.status !== 'MISSING'
  const needsAttention = document.status === 'NEEDS_CORRECTION' || document.status === 'REJECTED' || document.status === 'MISSING'
  const displayName = document.fileName?.split('/').pop() ?? ''

  async function handleView() {
    setViewing(true)
    try {
      const url = await onView()
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setViewing(false)
    }
  }

  return (
    <div className={`rounded-2xl border p-5 bg-white dark:bg-gray-900 ${needsAttention ? 'border-rose-200 dark:border-rose-900/50' : 'border-gray-200 dark:border-gray-800'}`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-gray-400 shrink-0" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{document.name}</h3>
        </div>
        {document.required && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">Required</span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{document.description}</p>

      <div className="mb-3">
        <StatusBadge label={DOCUMENT_STATUS_LABEL[document.status]} tone={documentTone(document.status)} />
      </div>

      {hasFile && (
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2 mb-3">
          <span className="truncate">{displayName}</span>
          <div className="flex items-center gap-2 shrink-0">
            {document.uploadedAt && <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>}
            <button type="button" onClick={handleView} disabled={viewing} className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
              {viewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} View
            </button>
          </div>
        </div>
      )}

      {document.reviewerComment && (
        <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2.5 mb-3">
          <MessageSquareWarning size={14} className="shrink-0 mt-0.5" />
          <span>&ldquo;{document.reviewerComment}&rdquo;</span>
        </div>
      )}

      {(document.status === 'MISSING' || document.status === 'NEEDS_CORRECTION' || document.status === 'REJECTED') && (
        uploading ? (
          <FileUpload
            acceptedFormats={document.acceptedFormats}
            maxSizeMb={document.maxSizeMb}
            onUpload={async (file) => { await onUpload(file); setUploading(false) }}
            compact
          />
        ) : (
          <button
            type="button"
            onClick={() => setUploading(true)}
            className="w-full text-center text-xs font-bold rounded-xl px-3 py-2.5 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
          >
            {hasFile ? 'Replace Document' : 'Upload Document'}
          </button>
        )
      )}
    </div>
  )
}
