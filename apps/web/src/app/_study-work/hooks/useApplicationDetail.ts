'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Which applicationId the loaded data belongs to; loading until it matches.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [finalDocuments, setFinalDocuments] = useState<FinalDocument[]>([])

  // Guards against a slow response for a previous applicationId overwriting
  // the current one.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!applicationId) return
    const id = ++requestId.current
    try {
      const [app, reqs, docs, tl, conv, finals] = await Promise.all([
        apps.getApplication(applicationId),
        apps.getRequirements(applicationId),
        apps.getDocuments(applicationId),
        apps.getTimeline(applicationId),
        apps.getConversationForApplication(applicationId),
        apps.getFinalDocuments(applicationId),
      ])
      const msgs = conv ? await apps.getMessages(conv.id) : []
      if (id !== requestId.current) return
      setApplication(app)
      setRequirements(reqs)
      setDocuments(docs)
      setTimeline(tl)
      setConversation(conv)
      setMessages(msgs)
      setFinalDocuments(finals)
    } catch (err) {
      console.error('[study-work] failed to load application', err)
    } finally {
      if (id === requestId.current) setLoadedFor(applicationId)
    }
  }, [applicationId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its awaited fetch resolves
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

  if (!applicationId) {
    return { application: null, requirements: [], documents: [], timeline: [], conversation: null, messages: [], finalDocuments: [], loading: false, refresh: load, uploadDocument, sendMessage }
  }
  const loading = loadedFor !== applicationId
  return { application, requirements, documents, timeline, conversation, messages, finalDocuments, loading, refresh: load, uploadDocument, sendMessage }
}
