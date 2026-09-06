import { Paperclip } from 'lucide-react'
import type { Message } from '../types'

export function MessageBubble({ message }: { message: Message }) {
  const isClient = message.sender === 'client'
  return (
    <div className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] sm:max-w-[65%] ${isClient ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isClient && <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-1">{message.senderName}</span>}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isClient
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          {message.body}
          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((a) => (
                <div key={a.name} className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 ${isClient ? 'bg-blue-500/40' : 'bg-white dark:bg-gray-900'}`}>
                  <Paperclip size={12} /> {a.name} <span className="opacity-70">· {a.size}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mx-1">
          {new Date(message.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
