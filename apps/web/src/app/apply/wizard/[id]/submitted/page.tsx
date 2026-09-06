'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { getApplication } from '../../../../_study-work/services/applicationService'
import { statusMeta } from '../../../../_study-work/lib/statusMachine'
import { StatusBadge } from '../../../../_study-work/components/StatusBadge'
import { LoadingState } from '../../../../_study-work/components/EmptyState'
import type { Application } from '../../../../_study-work/types'

export default function ApplicationSubmittedPage() {
  const params = useParams<{ id: string }>()
  const [application, setApplication] = useState<Application | null | undefined>(undefined)

  useEffect(() => {
    setApplication(getApplication(params.id))
  }, [params.id])

  if (application === undefined) return <div className="min-h-screen flex items-center justify-center"><LoadingState /></div>
  if (!application) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Application not found.</div>

  const meta = statusMeta(application.status)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <Image src="/logo.svg" alt="" width={32} height={32} unoptimized className="mx-auto mb-6" />
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Application Submitted</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Your application has been received. Our team will review your information and confirm the next steps.
        </p>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-left space-y-3 mb-8">
          <Row label="Application ID" value={application.applicationNumber} />
          <Row label="Application type" value={application.type === 'study' ? 'Study Abroad' : 'Work Abroad'} />
          <Row label="Destination" value={application.destination} />
          <Row label="Submitted" value={application.submittedAt ? new Date(application.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Current status</span>
            <StatusBadge label={meta.label} tone={meta.badgeTone} />
          </div>
        </div>

        <Link href="/apply/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3.5 transition-colors">
          Go to your dashboard <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}
