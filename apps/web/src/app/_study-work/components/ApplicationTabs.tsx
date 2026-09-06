'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap, Briefcase } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { statusMeta } from '../lib/statusMachine'
import type { Application } from '../types'

export function ApplicationHeader({ application }: { application: Application }) {
  const meta = statusMeta(application.status)
  const Icon = application.type === 'study' ? GraduationCap : Briefcase
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 mb-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h1 className="font-black text-lg text-gray-900 dark:text-white">
              {application.type === 'study' ? 'Study Abroad' : 'Work Abroad'} — {application.destination}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{application.applicationNumber}</p>
          </div>
        </div>
        <StatusBadge label={meta.label} tone={meta.badgeTone} />
      </div>
      <ProgressBar value={application.progress} label="Overall progress" />
    </div>
  )
}

export function ApplicationTabs({ applicationId }: { applicationId: string }) {
  const pathname = usePathname() ?? ''
  const base = `/apply/dashboard/application/${applicationId}`
  const tabs = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/personal`, label: 'Personal' },
    { href: `${base}/education-employment`, label: 'Education/Work' },
    { href: `${base}/requirements`, label: 'Requirements' },
    { href: `${base}/documents`, label: 'Documents' },
    { href: `${base}/timeline`, label: 'Timeline' },
    { href: `${base}/messages`, label: 'Messages' },
    { href: `${base}/final-documents`, label: 'Final Documents' },
  ]

  return (
    <div className="mb-6 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800 min-w-max">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3.5 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
