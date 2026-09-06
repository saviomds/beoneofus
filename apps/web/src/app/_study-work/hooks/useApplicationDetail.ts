'use client'

import { useCallback, useEffect, useState } from 'react'
import * as apps from '../services/applicationService'
import type { Application, DocumentItem, Message, Requirement, TimelineEvent, Conversation } from '../types'

interface ApplicationDetail {
  application: Application | null
  requirements: Requirement[]
  documents: DocumentItem[]
  timeline: TimelineEvent[]
  conversation: Conversation | null
  messages: Message[]
  loading: boolean
  refresh: () => void
  uploadDocument: (documentId: string, fileName: string) => void
  sendMessage: (body: string) => void
}

export function useApplicationDetail(applicationId: string | null): ApplicationDetail {
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const load = useCallback(() => {
    if (!applicationId) {
      setApplication(null); setRequirements([]); setDocuments([]); setTimeline([])
      setConversation(null); setMessages([]); setLoading(false)
      return
    }
    const app = apps.getApplication(applicationId)
    setApplication(app)
    setRequirements(apps.getRequirements(applicationId))
    setDocuments(apps.getDocuments(applicationId))
    setTimeline(apps.getTimeline(applicationId))
    const conv = apps.getConversationForApplication(applicationId)
    setConversation(conv)
    setMessages(conv ? apps.getMessages(conv.id) : [])
    setLoading(false)
  }, [applicationId])

  useEffect(() => { setLoading(true); load() }, [load])

  const uploadDocument = useCallback((documentId: string, fileName: string) => {
    apps.uploadDocument(documentId, fileName)
    load()
  }, [load])

  const sendMessage = useCallback((body: string) => {
    if (!conversation) return
    apps.sendMessage(conversation.id, body)
    load()
  }, [conversation, load])

  return { application, requirements, documents, timeline, conversation, messages, loading, refresh: load, uploadDocument, sendMessage }
}
