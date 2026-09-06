import Link from 'next/link'
import { GraduationCap, Briefcase, ArrowRight, MapPin } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { NextActionBanner } from './NextActionBanner'
import { statusMeta, nextAction } from '../lib/statusMachine'
import type { Application } from '../types'

export function ApplicationCard({ application, docsSummary }: { application: Application; docsSummary: { missing: number; needsCorrection: number } }) {
  const meta = statusMeta(application.status)
  const action = nextAction(application, docsSummary)
  const Icon = application.type === 'study' ? GraduationCap : Briefcase

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white truncate">
              {application.type === 'study' ? 'Study Abroad' : 'Work Abroad'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin size={11} /> {application.destination} · {application.applicationNumber}
            </p>
          </div>
        </div>
        <StatusBadge label={meta.label} tone={meta.badgeTone} />
      </div>

      <ProgressBar value={application.progress} label="Application progress" />

      {action && (
        <div className="mt-4">
          <NextActionBanner title={action.title} href={action.href} />
        </div>
      )}
      {!action && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-3">{meta.description}</p>
      )}

      <Link
        href={`/apply/dashboard/application/${application.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
      >
        View full application <ArrowRight size={13} />
      </Link>
    </div>
  )
}
