// Real, Supabase-backed data layer for the Study/Work Abroad portal. Every
// function here talks directly to the `study_work_*` tables through the
// browser client (anon key, session-authenticated) — the same pattern used
// elsewhere in apps/web for non-privileged authenticated data (see e.g.
// founder-dashboard's Tasks/Contracts tabs). Row-level security (see
// supabase/migrations/20260905_study_work_abroad.sql) restricts every read
// and write here to the caller's own rows; admin operations go through the
// separate service-role API route (/api/study-work/admin) instead.
import { supabase } from '../../supabaseClient'
import { newId } from '../lib/id'
import { defaultRequirementsFor, defaultDocumentsFor } from '../mock/requirementTemplates'
import { statusProgress } from '../lib/statusMachine'
import type {
  Application, ApplicationType, Requirement, DocumentItem,
  Conversation, Message, NotificationItem, TimelineEvent, FinalDocument,
  PersonalInfo, StudyDetails, WorkDetails, TravelInfo, ClientUser,
} from '../types'

// ── Row <-> domain mapping ───────────────────────────────────────────────────
// The tables use snake_case columns; the app's domain types use camelCase.
// Every query goes through one of these pairs so the mismatch lives in one
// place.

function toApplication(row: any): Application {
  return {
    id: row.id,
    applicationNumber: row.application_number,
    userId: row.user_id,
    type: row.type,
    destination: row.destination,
    status: row.status,
    progress: row.progress,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
    personal: row.personal,
    study: row.study,
    work: row.work,
    travel: row.travel,
    draftStep: row.draft_step,
  }
}

function applicationToRow(app: Application) {
  return {
    id: app.id,
    application_number: app.applicationNumber,
    user_id: app.userId,
    type: app.type,
    destination: app.destination,
    status: app.status,
    progress: app.progress,
    created_at: app.createdAt,
    submitted_at: app.submittedAt,
    confirmed_at: app.confirmedAt,
    personal: app.personal,
    study: app.study,
    work: app.work,
    travel: app.travel,
    draft_step: app.draftStep,
  }
}

function applicationPatchToRow(patch: Partial<Application>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.destination !== undefined) row.destination = patch.destination
  if (patch.status !== undefined) row.status = patch.status
  if (patch.progress !== undefined) row.progress = patch.progress
  if (patch.submittedAt !== undefined) row.submitted_at = patch.submittedAt
  if (patch.confirmedAt !== undefined) row.confirmed_at = patch.confirmedAt
  if (patch.personal !== undefined) row.personal = patch.personal
  if (patch.study !== undefined) row.study = patch.study
  if (patch.work !== undefined) row.work = patch.work
  if (patch.travel !== undefined) row.travel = patch.travel
  if (patch.draftStep !== undefined) row.draft_step = patch.draftStep
  return row
}

function toRequirement(row: any): Requirement {
  return {
    id: row.id,
    applicationId: row.application_id,
    name: row.name,
    description: row.description,
    required: row.required,
    status: row.status,
    deadline: row.deadline,
    instructions: row.instructions,
  }
}

function requirementToRow(r: Requirement) {
  return {
    id: r.id,
    application_id: r.applicationId,
    name: r.name,
    description: r.description,
    required: r.required,
    status: r.status,
    deadline: r.deadline,
    instructions: r.instructions,
  }
}

function toDocument(row: any): DocumentItem {
  return {
    id: row.id,
    applicationId: row.application_id,
    requirementId: row.requirement_id,
    name: row.name,
    description: row.description,
    required: row.required,
    status: row.status,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    reviewerComment: row.reviewer_comment,
    acceptedFormats: row.accepted_formats ?? [],
    maxSizeMb: row.max_size_mb,
  }
}

function documentToRow(d: DocumentItem) {
  return {
    id: d.id,
    application_id: d.applicationId,
    requirement_id: d.requirementId,
    name: d.name,
    description: d.description,
    required: d.required,
    status: d.status,
    file_name: d.fileName,
    uploaded_at: d.uploadedAt,
    reviewer_comment: d.reviewerComment,
    accepted_formats: d.acceptedFormats,
    max_size_mb: d.maxSizeMb,
  }
}

function toConversation(row: any): Conversation {
  return {
    id: row.id,
    applicationId: row.application_id,
    advisorName: row.advisor_name,
    advisorRole: row.advisor_role,
    lastMessageAt: row.last_message_at,
    unread: row.unread,
  }
}

function conversationToRow(c: Conversation) {
  return {
    id: c.id,
    application_id: c.applicationId,
    advisor_name: c.advisorName,
    advisor_role: c.advisorRole,
    last_message_at: c.lastMessageAt,
    unread: c.unread,
  }
}

function toMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    senderName: row.sender_name,
    body: row.body,
    attachments: row.attachments ?? [],
    createdAt: row.created_at,
  }
}

function messageToRow(m: Message) {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    sender: m.sender,
    sender_name: m.senderName,
    body: m.body,
    attachments: m.attachments,
    created_at: m.createdAt,
  }
}

function toNotification(row: any): NotificationItem {
  return {
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
  }
}

function toTimelineEvent(row: any): TimelineEvent {
  return {
    id: row.id,
    applicationId: row.application_id,
    label: row.label,
    description: row.description,
    status: row.status,
    date: row.date,
  }
}

function timelineToRow(t: TimelineEvent) {
  return {
    id: t.id,
    application_id: t.applicationId,
    label: t.label,
    description: t.description,
    status: t.status,
    date: t.date,
  }
}

function toFinalDocument(row: any): FinalDocument {
  return {
    id: row.id,
    applicationId: row.application_id,
    name: row.name,
    category: row.category,
    fileName: row.file_name,
    issuedAt: row.issued_at,
  }
}

// ── Empty defaults for a brand-new draft ─────────────────────────────────────

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

// ── Applications ──────────────────────────────────────────────────────────

export async function listApplicationsForUser(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('study_work_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toApplication)
}

export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabase.from('study_work_applications').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toApplication(data) : null
}

export async function createApplication(userId: string, type: ApplicationType, user?: ClientUser | null): Promise<Application> {
  const now = new Date().toISOString()
  const application: Application = {
    id: newId('app'),
    applicationNumber: `BOA-${type === 'study' ? 'STU' : 'WRK'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    type,
    destination: 'Mauritius',
    status: 'DRAFT',
    progress: statusProgress('DRAFT'),
    createdAt: now,
    submittedAt: null,
    confirmedAt: null,
    draftStep: 0,
    personal: emptyPersonal(user),
    study: emptyStudy(),
    work: emptyWork(),
    travel: emptyTravel(),
  }

  const { error: appErr } = await supabase.from('study_work_applications').insert(applicationToRow(application))
  if (appErr) throw appErr

  // Requirements must land before documents — documents reference them by id.
  const requirements = defaultRequirementsFor(type, application.id)
  if (requirements.length) {
    const { error } = await supabase.from('study_work_requirements').insert(requirements.map(requirementToRow))
    if (error) throw error
  }
  const documents = defaultDocumentsFor(requirements)
  if (documents.length) {
    const { error } = await supabase.from('study_work_documents').insert(documents.map(documentToRow))
    if (error) throw error
  }

  // No specific staff member is assigned yet — whoever actually replies from
  // the admin panel is shown by name (see ConversationThread.tsx, which reads
  // the real sender_name off their first message). This is just the
  // department label shown before anyone has replied.
  const conversation: Conversation = {
    id: newId('conv'),
    applicationId: application.id,
    advisorName: 'BeOneOfUs Advisor Team',
    advisorRole: type === 'study' ? 'Study Abroad Advisor' : 'Work Abroad Advisor',
    lastMessageAt: now,
    unread: 0,
  }
  const { error: convErr } = await supabase.from('study_work_conversations').insert(conversationToRow(conversation))
  if (convErr) throw convErr

  await seedTimelineForNewApplication(application.id)

  return application
}

export async function saveDraft(id: string, patch: Partial<Application>): Promise<Application | null> {
  const { data, error } = await supabase
    .from('study_work_applications')
    .update(applicationPatchToRow(patch))
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data ? toApplication(data) : null
}

// Applicants can only ever move DRAFT -> SUBMITTED themselves (enforced by a
// DB trigger, see the migration) — every later stage is a human admin
// decision made from the founder-dashboard admin panel.
export async function submitApplication(id: string): Promise<Application | null> {
  const updated = await saveDraft(id, { status: 'SUBMITTED', submittedAt: new Date().toISOString() })
  if (updated) await advanceTimeline(id, 'Application Submitted')
  return updated
}

// ── Requirements & documents ─────────────────────────────────────────────

export async function getRequirements(applicationId: string): Promise<Requirement[]> {
  const { data, error } = await supabase.from('study_work_requirements').select('*').eq('application_id', applicationId)
  if (error) throw error
  return (data ?? []).map(toRequirement)
}

export async function getDocuments(applicationId: string): Promise<DocumentItem[]> {
  const { data, error } = await supabase.from('study_work_documents').select('*').eq('application_id', applicationId)
  if (error) throw error
  return (data ?? []).map(toDocument)
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

const DOCUMENTS_BUCKET = 'study-work-documents'

// `document.fileName` stores the storage object's path (not just a display
// name) so a signed URL can be regenerated on demand — see
// getDocumentSignedUrl. UI code should display `fileName.split('/').pop()`.
export async function uploadDocument(applicationId: string, documentId: string, file: File): Promise<DocumentItem | null> {
  const path = `${applicationId}/${documentId}/${file.name}`
  const { error: uploadErr } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (uploadErr) throw uploadErr

  const { data, error } = await supabase
    .from('study_work_documents')
    .update({ status: 'UPLOADED', file_name: path, uploaded_at: new Date().toISOString(), reviewer_comment: null })
    .eq('id', documentId)
    .select()
    .maybeSingle()
  if (error) throw error

  if (data?.requirement_id) {
    await supabase.from('study_work_requirements').update({ status: 'UPLOADED' }).eq('id', data.requirement_id)
  }
  return data ? toDocument(data) : null
}

export async function getDocumentSignedUrl(storagePath: string, download = false): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 5, download ? { download: true } : undefined)
  if (error) throw error
  return data?.signedUrl ?? null
}

// ── Conversations & messages ──────────────────────────────────────────────

export async function getConversationForApplication(applicationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase.from('study_work_conversations').select('*').eq('application_id', applicationId).maybeSingle()
  if (error) throw error
  return data ? toConversation(data) : null
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('study_work_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toMessage)
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const message: Message = {
    id: newId('msg'),
    conversationId,
    sender: 'client',
    senderName: 'You',
    body,
    attachments: [],
    createdAt: new Date().toISOString(),
  }
  const { error } = await supabase.from('study_work_messages').insert(messageToRow(message))
  if (error) throw error
  await supabase.from('study_work_conversations').update({ last_message_at: message.createdAt }).eq('id', conversationId)
  return message
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function listNotificationsForUser(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('study_work_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toNotification)
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('study_work_notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('study_work_notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error) throw error
}

// ── Timeline ────────────────────────────────────────────────────────────

export async function getTimeline(applicationId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase.from('study_work_timeline').select('*').eq('application_id', applicationId)
  if (error) throw error
  return (data ?? []).map(toTimelineEvent)
}

export async function getFinalDocuments(applicationId: string): Promise<FinalDocument[]> {
  const { data, error } = await supabase.from('study_work_final_documents').select('*').eq('application_id', applicationId)
  if (error) throw error
  return (data ?? []).map(toFinalDocument)
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

async function seedTimelineForNewApplication(applicationId: string): Promise<void> {
  const events: TimelineEvent[] = TIMELINE_STAGES.map((label, i) => ({
    id: newId('tl'),
    applicationId,
    label,
    description: '',
    status: i === 0 ? 'done' : 'upcoming',
    date: i === 0 ? new Date().toISOString().slice(0, 10) : null,
  }))
  const { error } = await supabase.from('study_work_timeline').insert(events.map(timelineToRow))
  if (error) throw error
}

async function advanceTimeline(applicationId: string, throughLabel: string): Promise<void> {
  const stageIdx = TIMELINE_STAGES.indexOf(throughLabel)
  if (stageIdx === -1) return
  const events = await getTimeline(applicationId)
  const today = new Date().toISOString().slice(0, 10)

  await Promise.all(events.map((t) => {
    const idx = TIMELINE_STAGES.indexOf(t.label)
    if (idx === -1) return null
    let patch: { status: TimelineEvent['status']; date?: string } | null = null
    if (idx < stageIdx) patch = { status: 'done', date: t.date ?? today }
    else if (idx === stageIdx) patch = { status: 'done', date: today }
    else if (idx === stageIdx + 1) patch = { status: 'current' }
    else patch = { status: 'upcoming' }
    return supabase.from('study_work_timeline').update(patch).eq('id', t.id)
  }))
}
