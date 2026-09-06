'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Briefcase, ArrowRight, FileStack } from 'lucide-react'
import { useStudyWork } from '../state/StudyWorkContext'
import { EmptyState, LoadingState } from './EmptyState'

/** Sidebar items like "Requirements" or "Documents" don't know which
 * application to show. If the client has exactly one, jump straight there;
 * with more than one, let them pick; with none, prompt them to start one. */
export function ApplicationPicker({ subPath, title }: { subPath: string; title: string }) {
  const { loading, applications } = useStudyWork()
  const router = useRouter()

  useEffect(() => {
    if (!loading && applications.length === 1) {
      router.replace(`/apply/dashboard/application/${applications[0].id}${subPath}`)
    }
  }, [loading, applications, subPath, router])

  if (loading) return <LoadingState />

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<FileStack size={20} />}
        title="No applications yet"
        body="Start an application to see this section."
        action={<Link href="/apply" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 transition-colors">Start an Application <ArrowRight size={15} /></Link>}
      />
    )
  }

  if (applications.length === 1) return <LoadingState />

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-5">Choose an application — {title}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applications.map((app) => {
          const Icon = app.type === 'study' ? GraduationCap : Briefcase
          return (
            <Link key={app.id} href={`/apply/dashboard/application/${app.id}${subPath}`} className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Icon size={18} /></div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">{app.type === 'study' ? 'Study Abroad' : 'Work Abroad'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.applicationNumber}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
