'use client'

import { useState } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { useStudyWork } from '../state/StudyWorkContext'
import { statusMeta } from '../lib/statusMachine'
import type { ApplicationStatus } from '../types'

// Dev/demo-only affordance so the whole journey can be explored without a
// backend: jump any application straight to any status. Not an admin portal —
// just a local, client-side toggle for testing/demoing this feature.
const DEMO_STATUSES: ApplicationStatus[] = [
  'UNDER_REVIEW',
  'CONFIRMED',
  'FULL_APPLICATION',
  'DOCUMENT_COLLECTION',
  'DOCUMENT_REVIEW',
  'ADDITIONAL_INFORMATION_REQUIRED',
  'PROCESSING',
  'APPROVED',
  'COMPLETED',
]

export function DemoModeSwitcher() {
  const { applications, setDemoStatus } = useStudyWork()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')

  if (applications.length === 0) return null
  const activeId = selectedId || applications[0].id
  const active = applications.find((a) => a.id === activeId) ?? applications[0]

  return (
    <div className="fixed bottom-5 left-5 z-40 print:hidden">
      {open ? (
        <div className="w-72 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <FlaskConical size={13} /> Demo Mode
            </p>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={15} />
            </button>
          </div>

          {applications.length > 1 && (
            <select
              value={activeId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full mb-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-gray-700 dark:text-gray-200"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>{a.type === 'study' ? 'Study Abroad' : 'Work Abroad'} — {a.applicationNumber}</option>
              ))}
            </select>
          )}

          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">Jump this application to any stage:</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setDemoStatus(active.id, status)}
                className={`text-[11px] font-bold rounded-full px-2.5 py-1.5 transition-colors ${
                  active.status === status
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {statusMeta(status).shortLabel}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 shadow-lg transition-colors"
        >
          <FlaskConical size={14} /> Demo Mode
        </button>
      )}
    </div>
  )
}
