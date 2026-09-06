'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Briefcase, MessageSquare } from 'lucide-react'
import { useStudyWork } from '../../../_study-work/state/StudyWorkContext'
import { useApplicationDetail } from '../../../_study-work/hooks/useApplicationDetail'
import { ConversationThread } from '../../../_study-work/components/ConversationThread'
import { EmptyState, LoadingState } from '../../../_study-work/components/EmptyState'

export default function MessagesPage() {
  const { loading, applications } = useStudyWork()
  const [activeAppId, setActiveAppId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && applications.length > 0 && !activeAppId) {
      setActiveAppId(applications[0].id)
    }
  }, [loading, applications, activeAppId])

  const detail = useApplicationDetail(activeAppId)

  if (loading) return <LoadingState />

  if (applications.length === 0) {
    return <EmptyState icon={<MessageSquare size={20} />} title="No conversations yet" body="Start an application to connect with an advisor." />
  }

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-5">Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden h-fit">
          {applications.map((app) => {
            const Icon = app.type === 'study' ? GraduationCap : Briefcase
            const active = app.id === activeAppId
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setActiveAppId(app.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${active ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{app.type === 'study' ? 'Study Abroad' : 'Work Abroad'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.applicationNumber}</p>
                </div>
              </button>
            )
          })}
        </div>

        <ConversationThread conversation={detail.conversation} messages={detail.messages} onSend={detail.sendMessage} />
      </div>
    </div>
  )
}
