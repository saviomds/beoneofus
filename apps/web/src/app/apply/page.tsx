'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Briefcase, ArrowRight } from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'
import { useStudyWork } from '../_study-work/state/StudyWorkContext'
import { LoadingState } from '../_study-work/components/EmptyState'
import type { ApplicationType } from '../_study-work/types'

const CARDS: { type: ApplicationType; title: string; body: string; icon: React.ElementType; tint: string; cta: string }[] = [
  {
    type: 'study',
    title: 'Study Abroad',
    body: 'Find opportunities to study in Mauritius.',
    icon: GraduationCap,
    tint: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    cta: 'Apply for Study Abroad',
  },
  {
    type: 'work',
    title: 'Work Abroad',
    body: 'Explore opportunities to work in Mauritius.',
    icon: Briefcase,
    tint: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    cta: 'Apply for Work Abroad',
  },
]

export default function ApplySelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselected = searchParams.get('type')
  const { loading, user, applications, createApplication } = useStudyWork()
  const [starting, setStarting] = useState<ApplicationType | null>(null)

  function handleChoose(type: ApplicationType) {
    if (!user) {
      router.push(`/apply/register?type=${type}`)
      return
    }
    setStarting(type)
    const existing = applications.find((a) => a.type === type)
    const application = existing ?? createApplication(type)
    router.push(application.status === 'DRAFT' ? `/apply/wizard/${application.id}` : `/apply/dashboard/application/${application.id}`)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
          <div className="text-center mb-10">
            <Image src="/logo.svg" alt="" width={36} height={36} unoptimized className="mx-auto mb-5" />
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-3">
              What would you like to apply for?
            </h1>
            {!loading && !user && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Already have a beoneofus account?{' '}
                <Link href={`/login?next=/apply${preselected ? `?type=${preselected}` : ''}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Sign in
                </Link>{' '}
                to continue with it.
              </p>
            )}
          </div>

          {loading ? (
            <LoadingState label="Checking your account…" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {CARDS.map(({ type, title, body, icon: Icon, tint, cta }) => (
                <div
                  key={type}
                  className={`rounded-3xl border-2 p-8 text-center transition-colors ${
                    preselected === type ? 'border-blue-400 dark:border-blue-600' : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl ${tint} flex items-center justify-center mx-auto mb-5`}>
                    <Icon size={28} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">{title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{body}</p>
                  <button
                    type="button"
                    onClick={() => handleChoose(type)}
                    disabled={starting !== null}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold text-sm px-5 py-3.5 transition-colors dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {starting === type ? 'Starting…' : cta} <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
