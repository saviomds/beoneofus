'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface FileUploadProps {
  acceptedFormats: string[]
  maxSizeMb: number
  onUploaded: (fileName: string) => void
  compact?: boolean
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function FileUpload({ acceptedFormats, maxSizeMb, onUploaded, compact }: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = acceptedFormats.map((f) => `.${f.toLowerCase()}`).join(',')

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toUpperCase() ?? ''
    if (!acceptedFormats.includes(ext)) {
      setState('error')
      setError(`Unsupported format. Accepted: ${acceptedFormats.join(', ')}`)
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setState('error')
      setError(`File is too large. Maximum size is ${maxSizeMb}MB.`)
      return
    }
    setState('uploading')
    setError('')
    // Simulated upload — this feature has no backend yet; a real integration
    // would swap this timeout for an actual upload call.
    window.setTimeout(() => {
      setState('success')
      onUploaded(file.name)
    }, 900)
  }, [acceptedFormats, maxSizeMb, onUploaded])

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2.5">
        <CheckCircle2 size={16} className="shrink-0" />
        Document uploaded successfully.
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={`flex flex-col items-center justify-center gap-2 text-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${compact ? 'p-4' : 'p-6'} ${
          dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
        }`}
      >
        {state === 'uploading' ? (
          <Loader2 size={20} className="animate-spin text-blue-600" />
        ) : (
          <UploadCloud size={20} className="text-gray-400" />
        )}
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {state === 'uploading' ? 'Uploading…' : 'Drag & drop, or click to browse'}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {acceptedFormats.join(', ')} · up to {maxSizeMb}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {state === 'error' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
