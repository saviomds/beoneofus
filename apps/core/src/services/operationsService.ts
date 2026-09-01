import { api } from '@/lib/api'
import type {
  Application, ApplicationStatus, EducationStructureKey, FeeItem, FeeStructure, Id, ImportKind,
  ImportReport, Invoice, InvoiceStatus, Payment, PaymentMethod, Scholarship, Student, TimetableSlot,
} from '@shared/types'

type A = unknown

// --- timetable ------------------------------------------------------------

export const timetableService = {
  forClass: (_a: A, classId: Id) => api.get<TimetableSlot[]>(`/classes/${classId}/timetable`),
  forTeacher: (_a: A, teacherId: Id) => api.get<TimetableSlot[]>(`/teachers/${teacherId}/timetable`),
  create: (_a: A, input: { classId: Id; dayOfWeek: number; period: number; startTime: string; endTime: string; subjectId?: Id | null; teacherId?: Id | null; room?: string }) =>
    api.post<TimetableSlot>('/timetable', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<TimetableSlot>(`/timetable/${id}`, patch),
  remove: (_a: A, id: Id) => api.del(`/timetable/${id}`),
}

// --- admissions ---------------------------------------------------------- -

export const admissionService = {
  list: (_a: A, q: { status?: ApplicationStatus; intakeYear?: string } = {}) =>
    api.get<Application[]>('/applications', q as Record<string, unknown>),
  get: (_a: A, id: Id) => api.get<Application>(`/applications/${id}`),
  create: (_a: A, input: Record<string, unknown>) => api.post<Application>('/applications', input),
  submit: (_a: A, id: Id) => api.post<Application>(`/applications/${id}/submit`),
  review: (_a: A, id: Id, decision: 'shortlist' | 'offer' | 'reject' | 'waitlist' | 'start_review', input: Record<string, unknown> = {}) =>
    api.post<Application>(`/applications/${id}/review`, { decision, ...input }),
  acceptOffer: (_a: A, id: Id, note = '') => api.post<Application>(`/applications/${id}/accept-offer`, { note }),
  withdraw: (_a: A, id: Id, note = '') => api.post<Application>(`/applications/${id}/withdraw`, { note }),
  enroll: (_a: A, id: Id, input: { classId?: Id | null; academicYear?: string; email?: string } = {}) =>
    api.post<{ application: Application; student: Student }>(`/applications/${id}/enroll`, input),
}

// --- finance ----------------------------------------------------------- ---

export interface FinanceSummary {
  billed: number; collected: number; outstanding: number; overdueInvoices: number; currency: string
}

export const financeService = {
  summary: (_a?: A) => api.get<FinanceSummary>('/finance/summary'),
  feeStructures: (_a?: A) => api.get<FeeStructure[]>('/finance/fee-structures'),
  createFeeStructure: (_a: A, input: { name: string; level: EducationStructureKey; academicYear: string; currency?: string; items: FeeItem[]; isDefault?: boolean }) =>
    api.post<FeeStructure>('/finance/fee-structures', input),
  scholarships: (_a?: A) => api.get<Scholarship[]>('/finance/scholarships'),
  createScholarship: (_a: A, input: { name: string; kind: Scholarship['kind']; value: number; fundedBy?: string; studentIds?: Id[] }) =>
    api.post<Scholarship>('/finance/scholarships', input),
  invoices: (_a: A, q: { studentId?: Id; status?: InvoiceStatus } = {}) =>
    api.get<Invoice[]>('/finance/invoices', q as Record<string, unknown>),
  getInvoice: (_a: A, id: Id) => api.get<{ invoice: Invoice; payments: Payment[] }>(`/finance/invoices/${id}`),
  createInvoice: (_a: A, input: Record<string, unknown>) => api.post<Invoice>('/finance/invoices', input),
  setInvoiceStatus: (_a: A, id: Id, status: 'CANCELLED' | 'REFUNDED') => api.post<Invoice>(`/finance/invoices/${id}/status`, { status }),
  recordPayment: (_a: A, input: { invoiceId: Id; amount: number; method: PaymentMethod; reference?: string; note?: string }) =>
    api.post<{ payment: Payment; invoice: Invoice }>('/finance/payments', input),
}

// --- bulk import / year-end -------------------------------------------- ---

export const importService = {
  validate: (_a: A, kind: ImportKind, csv: string) => api.post<ImportReport>(`/import/${kind}/validate`, { csv }),
  commit: (_a: A, kind: ImportKind, csv: string) => api.post<ImportReport>(`/import/${kind}/commit`, { csv }),
}

export const batchService = {
  previewPromotion: (_a: A, input: { classId?: Id; gradeLevel?: string }) =>
    api.post<{ studentId: Id; studentName: string; currentGrade: string; nextGrade: string | null; action: string }[]>('/batch/promotion/preview', input),
  commitPromotion: (_a: A, input: { classId?: Id; gradeLevel?: string; toAcademicYear: string; overrides?: Record<Id, string> }) =>
    api.post<{ promoted: number; graduated: number; held: number }>('/batch/promotion/commit', input),
  previewGraduation: (_a: A, input: { classId?: Id; gradeLevel?: string }) =>
    api.post<{ studentId: Id; studentName: string; grade: string }[]>('/batch/graduation/preview', input),
  commitGraduation: (_a: A, input: { classId?: Id; gradeLevel?: string }) =>
    api.post<{ graduated: number }>('/batch/graduation/commit', input),
  archiveClass: (_a: A, classId: Id) => api.post<{ enrolmentsClosed: number }>('/batch/archive-class', { classId }),
}
