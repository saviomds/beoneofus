'use client'

import { useState } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from './EmptyState'
import type { Conversation, Message } from '../types'

interface ConversationThreadProps {
  conversation: Conversation | null
  messages: Message[]
  onSend: (body: string) => void
}

export function ConversationThread({ conversation, messages, onSend }: ConversationThreadProps) {
  const [draft, setDraft] = useState('')

  if (!conversation) {
    return <EmptyState icon={<MessageSquare size={20} />} title="No conversation yet" body="Your advisor conversation will appear here once your application starts." />
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[560px]">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
          {conversation.advisorName.split(' ').map((p) => p[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white">{conversation.advisorName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{conversation.advisorRole}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <button type="submit" aria-label="Send message" className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-50" disabled={!draft.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
