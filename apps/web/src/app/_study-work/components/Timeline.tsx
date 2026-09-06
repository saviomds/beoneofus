import { Check, Circle } from 'lucide-react'
import type { TimelineEvent } from '../types'

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {events.map((event, i) => {
        const isLast = i === events.length - 1
        return (
          <li key={event.id} className="relative pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[13px] top-7 -bottom-1 w-0.5 ${
                  event.status === 'upcoming' ? 'bg-gray-200 dark:bg-gray-800' : 'bg-blue-600'
                }`}
                aria-hidden="true"
              />
            )}
            <div className="flex items-start gap-3.5">
              <span
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                  event.status === 'done'
                    ? 'bg-blue-600 text-white'
                    : event.status === 'current'
                    ? 'bg-white dark:bg-gray-900 border-2 border-blue-600 text-blue-600'
                    : 'bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'
                }`}
              >
                {event.status === 'done' ? <Check size={14} /> : <Circle size={8} fill="currentColor" />}
              </span>
              <div className="pt-0.5">
                <p className={`text-sm font-bold ${event.status === 'upcoming' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                  {event.label}
                  {event.status === 'current' && (
                    <span className="ml-2 align-middle inline-block text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">In progress</span>
                  )}
                </p>
                {event.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{event.description}</p>
                )}
                {event.date && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
