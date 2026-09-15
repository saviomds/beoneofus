'use client'

import { useCallback, useEffect, useState } from 'react'
import * as apps from '../services/applicationService'
import type { Application, DocumentItem, FinalDocument, Message, Requirement, TimelineEvent, Conversation } from '../types'

interface ApplicationDetail {
  application: Application | null
  requirements: Requirement[]
  documents: DocumentItem[]
  timeline: TimelineEvent[]
  conversation: Conversation | null
  messages: Message[]
  finalDocuments: FinalDocument[]
  loading: boolean
  refresh: () => Promise<void>
  uploadDocument: (documentId: string, file: File) => Promise<void>
  sendMessage: (body: string) => Promise<void>
}

export function useApplicationDetail(applicationId: string | null): ApplicationDetail {
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [finalDocuments, setFinalDocuments] = useState<FinalDocument[]>([])

  const load = useCallback(async () => {
    if (!applicationId) {
      setApplication(null); setRequirements([]); setDocuments([]); setTimeline([])
      setConversation(null); setMessages([]); setFinalDocuments([]); setLoading(false)
      return
    }
    setLoading(true)
    const [app, reqs, docs, tl, conv, finals] = await Promise.all([
      apps.getApplication(applicationId),
      apps.getRequirements(applicationId),
      apps.getDocuments(applicationId),
      apps.getTimeline(applicationId),
      apps.getConversationForApplication(applicationId),
      apps.getFinalDocuments(applicationId),
    ])
    setApplication(app)
    setRequirements(reqs)
    setDocuments(docs)
    setTimeline(tl)
    setConversation(conv)
    setMessages(conv ? await apps.getMessages(conv.id) : [])
    setFinalDocuments(finals)
    setLoading(false)
  }, [applicationId])

  useEffect(() => { load() }, [load])

  const uploadDocument = useCallback(async (documentId: string, file: File) => {
    if (!applicationId) return
    await apps.uploadDocument(applicationId, documentId, file)
    await load()
  }, [applicationId, load])

  const sendMessage = useCallback(async (body: string) => {
    if (!conversation) return
    await apps.sendMessage(conversation.id, body)
    await load()
  }, [conversation, load])

  return { application, requirements, documents, timeline, conversation, messages, finalDocuments, loading, refresh: load, uploadDocument, sendMessage }
}
