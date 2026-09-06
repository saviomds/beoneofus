'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../_study-work/state/ApplicationDetailScope'
import { NextActionBanner } from '../../../../_study-work/components/NextActionBanner'
import { Timeline } from '../../../../_study-work/components/Timeline'
import { summarizeDocuments } from '../../../../_study-work/services/applicationService'
import { nextAction, isConfirmedOrLater } from '../../../../_study-work/lib/statusMachine'

export default function ApplicationOverviewTab() {
  const { application, requirements, documents, timeline } = useApplicationDetailScope()
  if (!application) return null

  const docsSummary = summarizeDocuments(documents)
  const action = nextAction(application, docsSummary)
  const unlocked = isConfirmedOrLater(application.status)

  return (
    <div className="space-y-5">
      {action && <NextActionBanner title={action.title} href={action.href} />}

      {!unlocked && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 p-5 text-sm leading-relaxed">
          <p className="font-bold mb-1">Your application is currently being reviewed.</p>
          <p>Once your application is confirmed, you will be able to continue with the next stage and receive your personalized requirements.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Requirements" value={`${requirements.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length}/${requirements.length}`} hint="approved" />
        <StatTile label="Documents" value={`${docsSummary.uploaded}/${docsSummary.required}`} hint="uploaded" />
        <StatTile label="Needs attention" value={String(docsSummary.needsCorrection)} hint="documents" tone={docsSummary.needsCorrection > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900 dark:text-white">Timeline</h2>
          <Link href={`/apply/dashboard/application/${application.id}/timeline`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Full timeline <ArrowRight size={12} />
          </Link>
        </div>
        <Timeline events={timeline.slice(0, 5)} />
      </div>
    </div>
  )
}

function StatTile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-2xl font-black mt-1 ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    </div>
  )
}
