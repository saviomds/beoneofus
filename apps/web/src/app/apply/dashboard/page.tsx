'use client'

import Link from 'next/link'
import { FileStack, ArrowRight } from 'lucide-react'
import { useStudyWork } from '../../_study-work/state/StudyWorkContext'
import { useApplicationDetail } from '../../_study-work/hooks/useApplicationDetail'
import { ApplicationCard } from '../../_study-work/components/ApplicationCard'
import { Timeline } from '../../_study-work/components/Timeline'
import { EmptyState } from '../../_study-work/components/EmptyState'
import { getDocuments, summarizeDocuments } from '../../_study-work/services/applicationService'

export default function DashboardOverviewPage() {
  const { user, applications } = useStudyWork()
  const primary = applications[0] ?? null
  const primaryDetail = useApplicationDetail(primary?.id ?? null)

  const combinedDocs = applications.reduce(
    (acc, app) => {
      const s = summarizeDocuments(getDocuments(app.id))
      return {
        required: acc.required + s.required,
        uploaded: acc.uploaded + s.uploaded,
        approved: acc.approved + s.approved,
        needsCorrection: acc.needsCorrection + s.needsCorrection,
        missing: acc.missing + s.missing,
      }
    },
    { required: 0, uploaded: 0, approved: 0, needsCorrection: 0, missing: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here&apos;s where things stand with your application.</p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <EmptyState
            icon={<FileStack size={22} />}
            title="No applications yet"
            body="Start a Study Abroad or Work Abroad application to see your progress here."
            action={
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 transition-colors">
                Start an Application <ArrowRight size={15} />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {applications.map((app) => (
              <ApplicationCardWithDocs key={app.id} applicationId={app.id} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
              <h2 className="font-black text-gray-900 dark:text-white mb-4">Documents</h2>
              <dl className="space-y-2.5 text-sm">
                <SummaryRow label="Required" value={combinedDocs.required} />
                <SummaryRow label="Uploaded" value={combinedDocs.uploaded} />
                <SummaryRow label="Approved" value={combinedDocs.approved} tone="text-emerald-600 dark:text-emerald-400" />
                <SummaryRow label="Needs correction" value={combinedDocs.needsCorrection} tone="text-rose-600 dark:text-rose-400" />
                <SummaryRow label="Missing" value={combinedDocs.missing} tone="text-amber-600 dark:text-amber-400" />
              </dl>
            </div>

            {primary && (
              <div className="lg:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-gray-900 dark:text-white">Application Timeline</h2>
                  <Link href={`/apply/dashboard/application/${primary.id}/timeline`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">View full timeline</Link>
                </div>
                <Timeline events={primaryDetail.timeline.slice(0, 5)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ApplicationCardWithDocs({ applicationId }: { applicationId: string }) {
  const { applications } = useStudyWork()
  const app = applications.find((a) => a.id === applicationId)
  if (!app) return null
  const docsSummary = summarizeDocuments(getDocuments(applicationId))
  return <ApplicationCard application={app} docsSummary={docsSummary} />
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`font-black ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</dd>
    </div>
  )
}
