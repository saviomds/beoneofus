// The single place the storage engine is chosen. Replace `new FileRepository`
// with `new SqlRepository` here (same interface) to move to Postgres/Supabase —
// nothing in server/services or the client changes.

import { FileStore } from './store/FileStore'
import { FileRepository } from './store/Repository'
import { runRecovery, ensureBaselineBackup } from './store/recovery'
import type { HealthReport } from './store/recovery'

export const store = new FileStore()

/** Called once from server/index.ts before listen(). */
export function bootStorage(): HealthReport {
  if (store.isEmpty()) store.seed()
  const report = runRecovery(store)
  ensureBaselineBackup(store)
  return report
}

export const organizationsRepo = new FileRepository(store, 'organizations', 'ORG')
export const usersRepo = new FileRepository(store, 'users', 'usr')
export const studentsRepo = new FileRepository(store, 'students', 'STD')
export const teachersRepo = new FileRepository(store, 'teachers', 'TCH')
export const mentorsRepo = new FileRepository(store, 'mentors', 'MEN')
export const mentorAssignmentsRepo = new FileRepository(store, 'mentorAssignments', 'MAS')
export const classesRepo = new FileRepository(store, 'classes', 'CLS')
export const subjectsRepo = new FileRepository(store, 'subjects', 'SUB')
export const enrollmentsRepo = new FileRepository(store, 'enrollments', 'ENR')
export const academicRepo = new FileRepository(store, 'academicRecords', 'ACR')
export const attendanceRepo = new FileRepository(store, 'attendance', 'ATT')
export const facultiesRepo = new FileRepository(store, 'faculties', 'FAC')
export const departmentsRepo = new FileRepository(store, 'departments', 'DEP')
export const programsRepo = new FileRepository(store, 'programs', 'PRG')
export const coursesRepo = new FileRepository(store, 'courses', 'CRS')
export const reportsRepo = new FileRepository(store, 'reports', 'RPT')
export const requestsRepo = new FileRepository(store, 'requests', 'REQ')
export const transferRequestsRepo = new FileRepository(store, 'transferRequests', 'TRF')
export const recordRequestsRepo = new FileRepository(store, 'recordRequests', 'RRQ')
export const recordGrantsRepo = new FileRepository(store, 'recordGrants', 'GRT')
export const consentsRepo = new FileRepository(store, 'consents', 'CNS')
export const campaignsRepo = new FileRepository(store, 'campaigns', 'CMP')
export const campaignSubmissionsRepo = new FileRepository(store, 'campaignSubmissions', 'CSB')
export const assessmentSchemesRepo = new FileRepository(store, 'assessmentSchemes', 'SCH')
export const assessmentsRepo = new FileRepository(store, 'assessments', 'ASM')
export const reportCardsRepo = new FileRepository(store, 'reportCards', 'RPC')
export const interventionsRepo = new FileRepository(store, 'interventions', 'INT')
export const guardianLinksRepo = new FileRepository(store, 'guardianLinks', 'GDL')
export const timetableSlotsRepo = new FileRepository(store, 'timetableSlots', 'TTS')
export const applicationsRepo = new FileRepository(store, 'applications', 'APP')
export const feeStructuresRepo = new FileRepository(store, 'feeStructures', 'FEE')
export const scholarshipsRepo = new FileRepository(store, 'scholarships', 'SCL')
export const invoicesRepo = new FileRepository(store, 'invoices', 'INV')
export const paymentsRepo = new FileRepository(store, 'payments', 'PAY')
export const sessionsRepo = new FileRepository(store, 'sessions', 'SES')
export const conversationsRepo = new FileRepository(store, 'conversations', 'CNV')
export const messagesRepo = new FileRepository(store, 'messages', 'MSG')
export const notificationsRepo = new FileRepository(store, 'notifications', 'NTF')
export const documentsRepo = new FileRepository(store, 'documents', 'DOC')
export const announcementsRepo = new FileRepository(store, 'announcements', 'ANN')
export const credentialsRepo = new FileRepository(store, 'credentials', 'CRD')
export const invitationsRepo = new FileRepository(store, 'invitations', 'INV')
export const auditRepo = new FileRepository(store, 'auditLogs', 'AUD')
export const settingsRepo = new FileRepository(store, 'settings', 'SET')
export const authSessionsRepo = new FileRepository(store, 'authSessions', 'sess')
