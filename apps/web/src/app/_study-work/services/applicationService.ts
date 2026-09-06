import { db } from './db'
import { newId } from './storage'
import { defaultRequirementsFor, defaultDocumentsFor } from '../mock/requirementTemplates'
import { statusProgress } from '../lib/statusMachine'
import type {
  Application, ApplicationType, ApplicationStatus, Requirement, DocumentItem,
  Conversation, Message, NotificationItem, TimelineEvent, FinalDocument,
  PersonalInfo, StudyDetails, WorkDetails, TravelInfo, ClientUser,
} from '../types'

function emptyPersonal(user?: ClientUser | null): PersonalInfo {
  return {
    legalFirstName: user?.firstName ?? '',
    middleName: user?.middleName ?? '',
    lastName: user?.lastName ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
    nationality: user?.nationality ?? '',
    countryOfResidence: user?.countryOfResidence ?? '',
    city: '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    address: '',
    emergencyContact: { name: '', relationship: '', phone: '', email: '' },
  }
}

function emptyStudy(): StudyDetails {
  return {
    educationLevel: '', preferredField: '', preferredProgram: '', preferredInstitution: '', preferredIntake: '',
    previousEducation: [], motivation: '', careerGoals: '', preferredLocation: '', budget: '', languages: '',
  }
}

function emptyWork(): WorkDetails {
  return {
    desiredOccupation: '', industry: '', skills: '', yearsOfExperience: '',
    educationLevel: '', preferredEmploymentType: '', expectedSalaryRange: '', preferredLocation: '',
    employmentHistory: [], certifications: [],
  }
}

function emptyTravel(): TravelInfo {
  return { passportStatus: '', passportNumber: '', issueDate: '', expiryDate: '', issuingCountry: '' }
}

export function listApplicationsForUser(userId: string): Application[] {
  return db.applications.all().filter((a) => a.userId === userId)
}

export function getApplication(id: string): Application | null {
  return db.applications.all().find((a) => a.id === id) ?? null
}

export function createApplication(userId: string, type: ApplicationType, user?: ClientUser | null): Application {
  const application: Application = {
    id: newId('app'),
    applicationNumber: `BOA-${type === 'study' ? 'STU' : 'WRK'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    type,
    destination: 'Mauritius',
    status: 'DRAFT',
    progress: statusProgress('DRAFT'),
    createdAt: new Date().toISOString(),
    submittedAt: null,
    confirmedAt: null,
    draftStep: 0,
    personal: emptyPersonal(user),
    study: emptyStudy(),
    work: emptyWork(),
    travel: emptyTravel(),
  }
  db.applications.save([...db.applications.all(), application])

  const requirements = defaultRequirementsFor(type, application.id)
  db.requirements.save([...db.requirements.all(), ...requirements])
  db.documents.save([...db.documents.all(), ...defaultDocumentsFor(requirements)])

  const conversation: Conversation = {
    id: newId('conv'),
    applicationId: application.id,
    advisorName: type === 'study' ? 'Grace Uwimana' : 'Eric Habimana',
    advisorRole: type === 'study' ? 'Study Abroad Advisor' : 'Work Abroad Advisor',
    lastMessageAt: new Date().toISOString(),
    unread: 0,
  }
  db.conversations.save([...db.conversations.all(), conversation])

  seedTimelineForNewApplication(application.id)

  return application
}

export function saveDraft(id: string, patch: Partial<Application>): Application | null {
  const all = db.applications.all()
  const idx = all.findIndex((a) => a.id === id)
  if (idx === -1) return null
  const updated: Application = { ...all[idx], ...patch }
  all[idx] = updated
  db.applications.save(all)
  return updated
}

export function submitApplication(id: string): Application | null {
  const app = saveDraft(id, {
    status: 'SUBMITTED',
    progress: statusProgress('SUBMITTED'),
    submittedAt: new Date().toISOString(),
  })
  if (app) advanceTimeline(id, 'Application Submitted')
  // Demo-only auto-advance: a real backend would move this to UNDER_REVIEW
  // once a human/queue actually picks it up. For the portal to feel alive
  // immediately after submitting, we move it there right away too.
  return setStatus(id, 'UNDER_REVIEW')
}

/** Demo Mode: directly set an application's status to explore every screen. */
export function setStatus(id: string, status: ApplicationStatus): Application | null {
  const app = getApplication(id)
  if (!app) return null
  const patch: Partial<Application> = { status, progress: statusProgress(status) }
  if (status === 'CONFIRMED' && !app.confirmedAt) patch.confirmedAt = new Date().toISOString()
  const updated = saveDraft(id, patch)
  syncTimelineToStatus(id, status)
  return updated
}

export function getRequirements(applicationId: string): Requirement[] {
  return db.requirements.all().filter((r) => r.applicationId === applicationId)
}

export function getDocuments(applicationId: string): DocumentItem[] {
  return db.documents.all().filter((d) => d.applicationId === applicationId)
}

export interface DocumentsSummary {
  required: number
  uploaded: number
  approved: number
  needsCorrection: number
  missing: number
}

export function summarizeDocuments(documents: DocumentItem[]): DocumentsSummary {
  return {
    required: documents.filter((d) => d.required).length,
    uploaded: documents.filter((d) => d.status !== 'MISSING').length,
    approved: documents.filter((d) => d.status === 'APPROVED').length,
    needsCorrection: documents.filter((d) => d.status === 'NEEDS_CORRECTION' || d.status === 'REJECTED').length,
    missing: documents.filter((d) => d.status === 'MISSING').length,
  }
}

export function uploadDocument(documentId: string, fileName: string): DocumentItem | null {
  const all = db.documents.all()
  const idx = all.findIndex((d) => d.id === documentId)
  if (idx === -1) return null
  const updated: DocumentItem = {
    ...all[idx],
    status: 'UPLOADED',
    fileName,
    uploadedAt: new Date().toISOString(),
    reviewerComment: null,
  }
  all[idx] = updated
  db.documents.save(all)

  // Keep the matching requirement in sync.
  if (updated.requirementId) {
    const reqs = db.requirements.all()
    const rIdx = reqs.findIndex((r) => r.id === updated.requirementId)
    if (rIdx !== -1) {
      reqs[rIdx] = { ...reqs[rIdx], status: 'UPLOADED' }
      db.requirements.save(reqs)
    }
  }
  return updated
}

export function getConversationForApplication(applicationId: string): Conversation | null {
  return db.conversations.all().find((c) => c.applicationId === applicationId) ?? null
}

export function listConversationsForUser(userId: string): Conversation[] {
  const appIds = new Set(listApplicationsForUser(userId).map((a) => a.id))
  return db.conversations.all().filter((c) => appIds.has(c.applicationId))
}

export function getMessages(conversationId: string): Message[] {
  return db.messages.all()
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function sendMessage(conversationId: string, body: string): Message {
  const message: Message = {
    id: newId('msg'),
    conversationId,
    sender: 'client',
    senderName: 'You',
    body,
    attachments: [],
    createdAt: new Date().toISOString(),
  }
  db.messages.save([...db.messages.all(), message])

  const conversations = db.conversations.all()
  const idx = conversations.findIndex((c) => c.id === conversationId)
  if (idx !== -1) {
    conversations[idx] = { ...conversations[idx], lastMessageAt: message.createdAt }
    db.conversations.save(conversations)
  }
  return message
}

export function listNotificationsForUser(userId: string): NotificationItem[] {
  const appIds = new Set(listApplicationsForUser(userId).map((a) => a.id))
  return db.notifications.all()
    .filter((n) => n.applicationId === null || appIds.has(n.applicationId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function markNotificationRead(id: string): void {
  const all = db.notifications.all()
  const idx = all.findIndex((n) => n.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], read: true }
  db.notifications.save(all)
}

export function markAllNotificationsRead(userId: string): void {
  const appIds = new Set(listApplicationsForUser(userId).map((a) => a.id))
  const all = db.notifications.all().map((n) =>
    (n.applicationId === null || appIds.has(n.applicationId)) ? { ...n, read: true } : n
  )
  db.notifications.save(all)
}

export function getTimeline(applicationId: string): TimelineEvent[] {
  return db.timeline.all().filter((t) => t.applicationId === applicationId)
}

export function getFinalDocuments(applicationId: string): FinalDocument[] {
  return db.finalDocuments.all().filter((f) => f.applicationId === applicationId)
}

const TIMELINE_STAGES = [
  'Application Created',
  'Application Submitted',
  'Initial Review',
  'Application Confirmed',
  'Information Completed',
  'Document Verification',
  'Processing',
  'Final Review',
  'Completed',
]

function seedTimelineForNewApplication(applicationId: string): void {
  const events: TimelineEvent[] = TIMELINE_STAGES.map((label, i) => ({
    id: newId('tl'),
    applicationId,
    label,
    description: '',
    status: i === 0 ? 'done' : 'upcoming',
    date: i === 0 ? new Date().toISOString().slice(0, 10) : null,
  }))
  db.timeline.save([...db.timeline.all(), ...events])
}

function advanceTimeline(applicationId: string, throughLabel: string): void {
  const all = db.timeline.all()
  const stageIdx = TIMELINE_STAGES.indexOf(throughLabel)
  if (stageIdx === -1) return
  const today = new Date().toISOString().slice(0, 10)
  const updated = all.map((t) => {
    if (t.applicationId !== applicationId) return t
    const idx = TIMELINE_STAGES.indexOf(t.label)
    if (idx === -1) return t
    if (idx < stageIdx) return { ...t, status: 'done' as const, date: t.date ?? today }
    if (idx === stageIdx) return { ...t, status: 'done' as const, date: today }
    if (idx === stageIdx + 1) return { ...t, status: 'current' as const }
    return { ...t, status: 'upcoming' as const }
  })
  db.timeline.save(updated)
}

const STATUS_TO_STAGE: Partial<Record<ApplicationStatus, string>> = {
  SUBMITTED: 'Application Submitted',
  UNDER_REVIEW: 'Initial Review',
  CONFIRMED: 'Application Confirmed',
  FULL_APPLICATION: 'Information Completed',
  DOCUMENT_COLLECTION: 'Document Verification',
  DOCUMENT_REVIEW: 'Document Verification',
  ADDITIONAL_INFORMATION_REQUIRED: 'Document Verification',
  PROCESSING: 'Processing',
  APPROVED: 'Final Review',
  COMPLETED: 'Completed',
}

function syncTimelineToStatus(applicationId: string, status: ApplicationStatus): void {
  const stage = STATUS_TO_STAGE[status]
  if (stage) advanceTimeline(applicationId, stage)
}
