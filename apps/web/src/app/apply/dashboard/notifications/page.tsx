'use client'

import { Bell } from 'lucide-react'
import { useStudyWork } from '../../../_study-work/state/StudyWorkContext'
import { useNotifications } from '../../../_study-work/hooks/useNotifications'
import { NotificationRow } from '../../../_study-work/components/NotificationRow'
import { EmptyState, LoadingState } from '../../../_study-work/components/EmptyState'
import { Button } from '../../../_study-work/components/FormControls'

export default function NotificationsPage() {
  const { loading, user } = useStudyWork()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id ?? null)

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Notifications</h1>
        {unreadCount > 0 && <Button type="button" variant="ghost" onClick={markAllRead}>Mark all as read</Button>}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title="No notifications" body="You're all caught up." />
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {notifications.map((n) => <NotificationRow key={n.id} notification={n} onRead={markRead} />)}
        </div>
      )}
    </div>
  )
}
