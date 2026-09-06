import {
  CheckCircle2, XCircle, FileWarning, MessageSquare, ArrowUpCircle, Clock, Bell,
} from 'lucide-react'
import type { NotificationItem, NotificationType } from '../types'

const ICONS: Record<NotificationType, React.ElementType> = {
  APPLICATION_CONFIRMED: CheckCircle2,
  DOCUMENT_APPROVED: CheckCircle2,
  DOCUMENT_REJECTED: XCircle,
  NEW_DOCUMENT_REQUIRED: FileWarning,
  ADVISOR_MESSAGE: MessageSquare,
  STAGE_ADVANCED: ArrowUpCircle,
  DEADLINE_REMINDER: Clock,
}

const TONE: Record<NotificationType, string> = {
  APPLICATION_CONFIRMED: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
  DOCUMENT_APPROVED: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
  DOCUMENT_REJECTED: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10',
  NEW_DOCUMENT_REQUIRED: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
  ADVISOR_MESSAGE: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
  STAGE_ADVANCED: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
  DEADLINE_REMINDER: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
}

export function NotificationRow({ notification, onRead }: { notification: NotificationItem; onRead: (id: string) => void }) {
  const Icon = ICONS[notification.type] ?? Bell
  return (
    <button
      type="button"
      onClick={() => !notification.read && onRead(notification.id)}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors ${
        notification.read ? 'bg-transparent' : 'bg-blue-50/40 dark:bg-blue-500/5'
      } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE[notification.type] ?? TONE.STAGE_ADVANCED}`}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`text-sm truncate ${notification.read ? 'font-semibold text-gray-700 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white'}`}>
            {notification.title}
          </span>
          {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notification.body}</span>
        <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {new Date(notification.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
      </span>
    </button>
  )
}
