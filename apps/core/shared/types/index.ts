// ---------------------------------------------------------------------------
// BeOneOfUs — shared domain types (client + server)
//
// Every record shape in the system. The repository layer, the services, the
// HTTP routes and the UI all speak these types. Swapping the storage backend
// (JSON files -> Postgres/Supabase) must not require changing this file.
// ---------------------------------------------------------------------------

export type Id = string
export type ISODate = string

export interface Timestamped {
  createdAt: ISODate
  updatedAt: ISODate
}

/** Every tenant-owned record carries these. */
export interface TenantOwned {
  organizationId: Id
  version: number
}

// --- Roles ----------------------------------------------------------------

export type Role = 'student' | 'teacher' | 'mentor' | 'guardian' | 'school' | 'government' | 'admin'

/** Roles held *inside* an institution (separate from the platform Role). */
export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'principal'
  | 'registrar'
  | 'academic_director'
  | 'teacher'
  | 'mentor'
  | 'counselor'
  | 'student'

export type OrganizationType =
  | 'SCHOOL'
  | 'UNIVERSITY'
  | 'COLLEGE'
  | 'TRAINING_CENTER'
  | 'GOVERNMENT_INSTITUTION'
  | 'OTHER'

export type EducationStructureKey =
  | 'PRIMARY'
  | 'LOWER_SECONDARY'
  | 'O_LEVEL'
  | 'UPPER_SECONDARY'
  | 'A_LEVEL'
  | 'VOCATIONAL'
  | 'COLLEGE'
  | 'UNIVERSITY'
  | 'POSTGRADUATE'

export const ROLE_CODE_PREFIX: Record<string, Role> = {
  'BOU-STU': 'student',
  'BOU-TEA': 'teacher',
  'BOU-MEN': 'mentor',
  'BOU-GDN': 'guardian',
  'BOU-SCH': 'school',
  'BOU-ORG': 'school',
  'BOU-GOV': 'government',
  'BOU-ADM': 'admin',
}

// --- Status unions ------------------------------------------------------- -

export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive' | 'archived'
export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED' | 'GRADUATED' | 'WITHDRAWN'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
export type TransferStatus =
  | 'INITIATED'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'

export type ReportStatus =
  | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived'

export type RequestStatus =
  | 'draft' | 'submitted' | 'received' | 'under_review' | 'need_information'
  | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'left_early'
export type ExcuseStatus = 'none' | 'requested' | 'approved' | 'rejected'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'archived'
export type ReportCardStatus = 'draft' | 'published'
export type ApplicationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'OFFERED'
  | 'OFFER_ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'ENROLLED' | 'WITHDRAWN'
export type InvoiceStatus =
  | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'waiver' | 'other'
export type ScholarshipKind = 'percentage' | 'fixed'
export type ImportKind = 'students' | 'teachers' | 'guardians'
export type InterventionKind = 'attendance' | 'academic' | 'conduct'
export type InterventionStatus = 'open' | 'in_progress' | 'resolved' | 'escalated'
export type GuardianLinkStatus = 'pending' | 'active' | 'revoked'
export type GuardianRelationship = 'mother' | 'father' | 'guardian' | 'other'

// --- Inter-institution record sharing ----------------------------------- --

/** Categories of student data that can be shared between institutions. */
export type RecordType =
  | 'IDENTITY'
  | 'ENROLLMENTS'
  | 'ACADEMIC_RECORDS'
  | 'ATTENDANCE_SUMMARY'
  | 'REPORTS'
  | 'CREDENTIALS'
  | 'TRANSFER_HISTORY'

export const RECORD_TYPES: RecordType[] = [
  'IDENTITY', 'ENROLLMENTS', 'ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY',
  'REPORTS', 'CREDENTIALS', 'TRANSFER_HISTORY',
]

export type RecordRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'FULFILLED'

export type ConsentStatus =
  | 'REQUESTED'
  | 'GRANTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'REVOKED'

export type GrantReason = 'STUDENT_TRANSFER' | 'RECORDS_REQUEST'
export type GrantStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export type CampaignStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'CLOSED'
  | 'ARCHIVED'

export type CampaignSubmissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RETURNED'
  | 'APPROVED'

export type CampaignFieldType = 'text' | 'number' | 'integer' | 'boolean' | 'select' | 'date'

export type Permission = string // see shared/rbac.ts

// --- Organizations (the tenant root) -------------------------------------

export interface Organization extends Timestamped {
  id: Id // ORG-RW-SCH-000001
  organizationCode: string
  organizationType: OrganizationType
  institutionLevels: EducationStructureKey[]
  officialName: string
  shortName: string
  registrationNumber: string
  country: string
  province: string
  district: string
  city: string
  address: string
  phone: string
  email: string
  website: string
  logo: string | null
  headName: string // principal / vice-chancellor / director
  headTitle: string
  status: OrgStatus
  authorizedBy: Id | null // admin or government user who authorized it
  version: number
}

// --- Users --------------------------------------------------------------- -

export interface User extends Timestamped {
  id: Id
  code: string // BOU-STU-10231
  passwordHash: string
  passwordSalt: string
  role: Role
  organizationRole: OrganizationRole | null
  status: UserStatus
  name: string
  email: string
  phone: string
  avatar: string | null
  lastLogin: ISODate | null
  failedLogins: number
  lockedUntil: ISODate | null
  permissions: Permission[]
  organizationId: Id | null
  /** Government scoping policy, only for role === 'government'. */
  govScope: GovScope | null
  version: number
}

export interface GovScope {
  level: 'NATIONAL' | 'REGIONAL' | 'DISTRICT'
  provinces?: string[]
  districts?: string[]
  department?: string
}

/** User with secrets stripped — the only shape that reaches the client. */
export type SafeUser = Omit<User, 'passwordHash' | 'passwordSalt'>

// --- People ------------------------------------------------------------- --

export interface Student extends Timestamped, TenantOwned {
  id: Id // BOU-STU-RW-2026-000001
  userId: Id
  schoolId: Id // === organizationId (kept for compatibility)
  institutionStudentNumber: string
  studentNumber: string // legacy alias
  firstName: string
  middleName: string
  lastName: string
  dateOfBirth: ISODate
  gender: 'male' | 'female' | 'other'
  nationality: string
  gradeLevel: string // derived from active enrollment
  classId: Id | null // derived from active enrollment
  program: string
  studyCode: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  emergencyContact: string
  address: string
  enrollmentDate: ISODate
  teacherId: Id | null
  mentorId: Id | null
  skills: string[]
  interests: string[]
  achievements: string[]
  status: UserStatus
  profileCompletion: number
}

export interface Teacher extends Timestamped, TenantOwned {
  id: Id
  userId: Id
  schoolId: Id
  staffNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  subjects: string[]
  classIds: Id[]
  departmentId: Id | null
  qualifications: string[]
  experienceYears: number
  employmentStatus: 'full_time' | 'part_time' | 'contract'
  isMentor: boolean
  isLecturer: boolean
  status: UserStatus
}

export interface Mentor extends Timestamped {
  id: Id
  userId: Id
  organizationId: Id | null // null = BeOneOfUs network mentor
  schoolId: Id | null
  specialization: string
  skills: string[]
  experienceYears: number
  availability: string
  assignedStudentIds: Id[]
  bio: string
  status: UserStatus
  version: number
}

export interface MentorAssignment extends Timestamped {
  id: Id
  mentorId: Id
  studentId: Id
  organizationId: Id
  startDate: ISODate
  endDate: ISODate | null
  status: 'active' | 'ended'
  permissions: Permission[]
  version: number
}

// --- Academic structure ------------------------------------------------- --

export interface ClassRecord extends Timestamped, TenantOwned {
  id: Id
  schoolId: Id
  classCode: string // S3-A-MPC-2026
  name: string
  level: EducationStructureKey
  gradeLevel: string
  section: string
  studyCode: string
  academicYear: string
  homeroomTeacherId: Id | null
  subjectIds: Id[]
  studentIds: Id[]
  capacity: number
  room: string
  status: 'active' | 'scheduled' | 'archived'
}

export interface Subject extends Timestamped, TenantOwned {
  id: Id
  schoolId: Id
  name: string
  code: string
  department: string
  description: string
}

export interface Enrollment extends Timestamped {
  id: Id // ENR-2026-000001
  studentId: Id
  organizationId: Id
  academicYear: string
  level: EducationStructureKey
  gradeLevel: string
  classId: Id | null
  studyCode: string
  status: EnrollmentStatus
  startDate: ISODate
  endDate: ISODate | null
  note: string
  version: number
}

export interface AcademicRecord extends Timestamped, TenantOwned {
  id: Id
  studentId: Id
  schoolId: Id
  subjectId: Id
  subjectName: string
  term: string
  score: number
  grade: string
  teacherId: Id
  teacherComment: string
}

export interface AttendanceRecord extends Timestamped, TenantOwned {
  id: Id
  studentId: Id
  schoolId: Id
  classId: Id | null
  /** period-level attendance: 0 = whole day, 1..n = a timetabled period */
  period: number
  subjectId: Id | null
  date: ISODate
  status: AttendanceStatus
  recordedBy: Id
  note: string
  excuseStatus: ExcuseStatus
  excuseReason: string
  excuseDocumentId: Id | null
  excusedBy: Id | null
  excusedAt: ISODate | null
}

// --- Weighted assessments, report cards, transcripts --------------------- -

export interface AssessmentComponent {
  key: string
  label: string
  weight: number // percentage points; components sum to 100
}

export interface GradeBand {
  min: number // inclusive lower bound on the 0–100 weighted score
  letter: string
  gpa: number
  label: string
}

/** Per-organization + level grading configuration. Never hard-coded. */
export interface AssessmentScheme extends Timestamped, TenantOwned {
  id: Id
  name: string
  level: EducationStructureKey
  components: AssessmentComponent[]
  gradeBands: GradeBand[]
  passMark: number
  isDefault: boolean
}

export interface Assessment extends Timestamped, TenantOwned {
  id: Id
  studentId: Id
  classId: Id | null
  subjectId: Id
  subjectName: string
  academicYear: string
  term: string
  componentKey: string
  title: string
  score: number
  maxScore: number
  date: ISODate
  teacherId: Id
  comment: string
}

export interface ReportCardLine {
  subjectId: Id
  subjectName: string
  components: { key: string; label: string; percent: number | null; weight: number }[]
  weightedScore: number | null
  letter: string
  gpa: number
  position: number | null
  remark: string
}

export interface ReportCard extends Timestamped, TenantOwned {
  id: Id // RPC-2026-00001
  reference: string
  studentId: Id
  studentName: string
  classId: Id | null
  academicYear: string
  term: string
  schemeId: Id | null
  lines: ReportCardLine[]
  gpa: number
  average: number
  overallPosition: number | null
  classSize: number
  attendanceRate: number
  conduct: string
  headTeacherRemark: string
  status: ReportCardStatus
  publishedAt: ISODate | null
  publishedBy: Id | null
}

export interface InterventionNote {
  id: Id
  at: ISODate
  actorId: Id
  note: string
}

export interface Intervention extends Timestamped, TenantOwned {
  id: Id // INT-2026-00001
  reference: string
  studentId: Id
  studentName: string
  kind: InterventionKind
  reason: string
  status: InterventionStatus
  openedBy: Id
  assignedTo: Id | null
  notes: InterventionNote[]
  metric: number | null
  threshold: number | null
  autoOpened: boolean
}

// --- Timetable --------------------------------------------------------- ---

export interface TimetableSlot extends Timestamped, TenantOwned {
  id: Id
  classId: Id
  dayOfWeek: number // 1 = Monday … 5 = Friday
  period: number // 1..n
  startTime: string // "08:00"
  endTime: string // "08:50"
  subjectId: Id | null
  subjectName: string
  teacherId: Id | null
  room: string
}

// --- Admissions ------------------------------------------------------- -----

export interface ApplicationTimelineEntry {
  id: Id
  at: ISODate
  actorId: Id
  action: string
  note: string
  status: ApplicationStatus
}

export interface Application extends Timestamped, TenantOwned {
  id: Id // APP-2026-00001
  reference: string
  applicantFirstName: string
  applicantLastName: string
  dateOfBirth: ISODate
  gender: 'male' | 'female' | 'other'
  nationality: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  priorSchool: string
  gradeApplyingFor: string
  level: EducationStructureKey
  studyCode: string
  intakeYear: string
  notes: string
  status: ApplicationStatus
  assessmentScore: number | null
  decisionNote: string
  offerExpiresAt: ISODate | null
  studentId: Id | null // set when converted to an enrolment
  submittedBy: Id
  reviewedBy: Id | null
  timeline: ApplicationTimelineEntry[]
}

// --- Finance --------------------------------------------------------- -----

export interface FeeItem {
  label: string
  amount: number
}

export interface FeeStructure extends Timestamped, TenantOwned {
  id: Id
  name: string
  level: EducationStructureKey
  academicYear: string
  currency: string
  items: FeeItem[]
  total: number
  isDefault: boolean
}

export interface Scholarship extends Timestamped, TenantOwned {
  id: Id
  name: string
  kind: ScholarshipKind
  value: number // percent (0–100) or a fixed amount
  fundedBy: string
  studentIds: Id[]
}

export interface Invoice extends Timestamped, TenantOwned {
  id: Id // INV-FEE-2026-00001
  reference: string
  studentId: Id
  studentName: string
  feeStructureId: Id | null
  academicYear: string
  term: string
  currency: string
  lineItems: FeeItem[]
  gross: number
  discount: number
  scholarshipId: Id | null
  total: number
  paidAmount: number
  status: InvoiceStatus
  dueDate: ISODate
  issuedBy: Id
}

export interface Payment extends Timestamped, TenantOwned {
  id: Id
  receiptNumber: string
  invoiceId: Id
  studentId: Id
  amount: number
  currency: string
  method: PaymentMethod
  reference: string
  note: string
  recordedBy: Id
}

// --- Bulk import ----------------------------------------------------- ------

export interface ImportRowResult {
  row: number
  data: Record<string, string>
  ok: boolean
  created: boolean
  id: Id | null
  errors: string[]
  warnings: string[]
}

export interface ImportReport {
  kind: ImportKind
  total: number
  created: number
  failed: number
  warnings: number
  rows: ImportRowResult[]
}

// --- Guardians --------------------------------------------------------- ---

/**
 * Links a guardian account to a student. A guardian may be linked to children
 * at DIFFERENT institutions. Read access is scoped to `canViewRecordTypes` and
 * always passes through the normal record gate — it never bypasses a school.
 */
export interface GuardianLink extends Timestamped {
  id: Id // GDL-2026-00001
  guardianUserId: Id
  studentId: Id
  organizationId: Id // the student's institution when the link was created (informational)
  relationship: GuardianRelationship
  status: GuardianLinkStatus
  canViewRecordTypes: RecordType[]
  isPrimary: boolean
  addedBy: Id
  verifiedAt: ISODate | null
  version: number
}

// --- University structures -------------------------------------------- ----

export interface Faculty extends Timestamped, TenantOwned {
  id: Id
  name: string
  code: string
  deanName: string
}

export interface Department extends Timestamped, TenantOwned {
  id: Id
  facultyId: Id
  name: string
  code: string
  headName: string
}

export interface Program extends Timestamped, TenantOwned {
  id: Id
  departmentId: Id
  name: string
  code: string // BSc-SE
  level: EducationStructureKey
  durationYears: number
  studyCode: string
}

export interface Course extends Timestamped, TenantOwned {
  id: Id
  programId: Id
  name: string
  code: string
  credits: number
  year: number
  semester: number
}

// --- Reports / requests / sessions ---------------------------------- ------

export interface AttachmentRef {
  id: Id
  fileName: string
  size: number
  note: string
}

export interface Report extends Timestamped {
  id: Id
  reference: string
  organizationId: Id | null
  version: number
  type:
    | 'academic' | 'progress' | 'attendance' | 'behavior' | 'mentorship'
    | 'teacher' | 'mentor' | 'school_performance' | 'monthly' | 'term'
    | 'annual' | 'career'
  subject: string
  authorId: Id
  targetUserId: Id | null
  content: string
  attachments: AttachmentRef[]
  status: ReportStatus
  reviewedBy: Id | null
  reviewedAt: ISODate | null
  reviewNote: string
}

export interface RequestTimelineEntry {
  id: Id
  at: ISODate
  actorId: Id
  action: string
  note: string
  status: RequestStatus
}

export interface GovRequest extends Timestamped {
  id: Id
  reference: string
  schoolId: Id // === organizationId of the raising institution
  organizationId: Id
  version: number
  governmentId: Id | null
  governmentDepartment: string
  type: string
  title: string
  description: string
  attachments: AttachmentRef[]
  priority: Priority
  status: RequestStatus
  submittedAt: ISODate | null
  assignedOfficerId: Id | null
  response: string
  timeline: RequestTimelineEntry[]
}

export interface MentorshipSession extends Timestamped {
  id: Id
  mentorId: Id
  studentId: Id
  organizationId: Id | null
  schoolId: Id | null
  version: number
  date: ISODate
  time: string
  topic: string
  status: SessionStatus
  goals: string[]
  progressNote: string
  privateNote: string
}

// --- Transfers ------------------------------------------------------ ------

export interface TransferRequest extends Timestamped {
  id: Id // TRF-2026-000001
  studentId: Id
  studentName: string
  fromOrganizationId: Id
  toOrganizationId: Id
  reason: string
  status: TransferStatus
  initiatedBy: Id
  approvedBy: Id | null
  acceptedBy: Id | null
  targetLevel: EducationStructureKey
  targetAcademicYear: string
  timeline: RequestTimelineEntry[]
  version: number
}

// --- Communication ------------------------------------------------- -------

export interface Conversation extends Timestamped {
  id: Id
  participantIds: Id[]
  organizationId: Id | null
  subject: string
  lastMessageAt: ISODate
  version: number
}

export interface Message extends Timestamped {
  id: Id
  conversationId: Id
  senderId: Id
  body: string
  readBy: Id[]
  attachments: AttachmentRef[]
}

export interface Notification extends Timestamped {
  id: Id
  recipientId: Id
  organizationId: Id | null
  type:
    | 'system' | 'academic' | 'attendance' | 'mentorship' | 'report'
    | 'government' | 'request' | 'message' | 'security' | 'onboarding' | 'transfer'
  title: string
  message: string
  read: boolean
  actionUrl: string | null
}

export interface DocumentRecord extends Timestamped {
  id: Id
  ownerId: Id
  organizationId: Id | null
  version: number
  type: string
  title: string
  fileName: string
  size: number
  uploadedBy: Id
  status: DocumentStatus
  note: string
}

export interface Announcement extends Timestamped {
  id: Id
  authorId: Id
  organizationId: Id | null
  version: number
  audience: Role[] | 'all'
  scope: 'school' | 'government' | 'platform'
  title: string
  body: string
  priority: Priority
  pinned: boolean
}

export interface Credential extends Timestamped {
  id: Id
  studentId: Id
  organizationId: Id
  version: number
  title: string
  issuer: string
  issuedDate: ISODate
  type: 'certificate' | 'badge' | 'diploma' | 'award'
  verificationCode: string
  status: 'issued' | 'revoked'
}

// --- Inter-institution record requests / consent / grants --------------- --

/**
 * A formal request from one institution to another for a student's historical
 * records. Approving it produces a time-limited, read-only RecordShareGrant.
 * The requester never sees any record data until (and unless) it is approved.
 */
export interface RecordRequest extends Timestamped {
  id: Id // RRQ-2026-00001
  reference: string
  studentId: Id
  studentName: string
  /** the institution that holds the records */
  sourceOrganizationId: Id
  /** the institution asking for them */
  requestingOrganizationId: Id
  requestedBy: Id
  requestedRecordTypes: RecordType[]
  approvedRecordTypes: RecordType[]
  purpose: string
  legalBasis: string
  consentId: Id | null
  status: RecordRequestStatus
  reviewedBy: Id | null
  reviewedAt: ISODate | null
  decisionNote: string
  grantId: Id | null
  expiresAt: ISODate | null
  timeline: RequestTimelineEntry[]
  version: number
}

/** Immutable consent ledger entry. History only ever grows. */
export interface ConsentEvent {
  id: Id
  at: ISODate
  actorId: Id
  action: string
  note: string
  status: ConsentStatus
}

export interface Consent extends Timestamped {
  id: Id // CNS-2026-00001
  studentId: Id
  /** the person who gave consent, if they hold an account */
  subjectUserId: Id | null
  grantedByName: string
  grantedByRelationship: 'self' | 'parent' | 'guardian' | 'legal_representative' | 'other'
  requestingOrganizationId: Id
  sourceOrganizationId: Id
  scopeRecordTypes: RecordType[]
  purpose: string
  legalBasis: string
  termsVersion: string
  status: ConsentStatus
  requestId: Id | null
  decidedAt: ISODate | null
  expiresAt: ISODate | null
  history: ConsentEvent[]
  version: number
}

/**
 * The read-only access artifact. Records are NEVER copied between institutions
 * — instead the receiving institution is granted scoped, revocable, optionally
 * time-limited read access to the live records at the source. Every record
 * retains its original `organizationId` (source institution).
 */
export interface RecordShareGrant extends Timestamped {
  id: Id // GRT-2026-00001
  studentId: Id
  sourceOrganizationId: Id
  recipientOrganizationId: Id
  recordTypes: RecordType[]
  reason: GrantReason
  requestId: Id | null
  transferId: Id | null
  consentId: Id | null
  grantedBy: Id
  grantedAt: ISODate
  expiresAt: ISODate | null
  revokedAt: ISODate | null
  revokedBy: Id | null
  status: GrantStatus
  version: number
}

// --- Government data-collection campaigns ------------------------------- --

export interface CampaignField {
  key: string
  label: string
  type: CampaignFieldType
  required: boolean
  options: string[]
  help: string
}

export interface Campaign extends Timestamped {
  id: Id // CMP-2026-00001
  reference: string
  title: string
  description: string
  createdBy: Id
  governmentOrganizationId: Id | null
  fields: CampaignField[]
  audienceOrganizationTypes: OrganizationType[]
  targetOrganizationIds: Id[]
  opensAt: ISODate
  dueAt: ISODate
  status: CampaignStatus
  version: number
}

export interface CampaignSubmission extends Timestamped {
  id: Id // CSB-2026-00001
  campaignId: Id
  organizationId: Id
  data: Record<string, unknown>
  status: CampaignSubmissionStatus
  submittedBy: Id | null
  submittedAt: ISODate | null
  reviewedBy: Id | null
  reviewedAt: ISODate | null
  reviewNote: string
  version: number
}

// --- Invitations -------------------------------------------------- --------

export interface Invitation extends Timestamped {
  id: Id // INV-2026-000001
  tokenHash: string // sha256(token) — the raw token is never stored
  organizationName: string
  organizationType: OrganizationType
  institutionLevels: EducationStructureKey[]
  recipientEmail: string
  recipientName: string
  issuedBy: Id
  issuedByType: 'ADMIN' | 'GOVERNMENT'
  permissions: Permission[]
  expiresAt: ISODate
  status: InvitationStatus
  acceptedAt: ISODate | null
  organizationId: Id | null
  version: number
}

// --- Audit / settings / sessions ----------------------------------- ------

export interface AuditLog {
  id: Id
  actorId: Id
  actorRole: Role | 'system'
  organizationId: Id | null
  action: string
  targetId: Id | null
  targetType: string | null
  timestamp: ISODate
  ip: string
  result: 'SUCCESS' | 'DENIED' | 'ERROR'
  metadata: Record<string, unknown>
}

export interface SettingsRecord {
  id: Id
  ownerId: Id
  organizationId: Id | null
  scope: 'user' | 'school' | 'government' | 'platform'
  values: Record<string, unknown>
  version: number
  updatedAt: ISODate
}

export interface SessionRecord {
  id: Id // random session id (cookie value)
  userId: Id
  createdAt: number
  expiresAt: number
  ip: string
  userAgent: string
  impersonatorId: Id | null
}

/** Payload returned by /api/auth/me and /api/auth/login. */
export interface AuthPayload {
  user: SafeUser
  permissions: Permission[]
  organization: Organization | null
  impersonating: boolean
  expiresAt: number
}

// --- Collection registry ---------------------------------------- ----------

export interface CollectionMap {
  organizations: Organization
  users: User
  students: Student
  teachers: Teacher
  mentors: Mentor
  mentorAssignments: MentorAssignment
  classes: ClassRecord
  subjects: Subject
  enrollments: Enrollment
  academicRecords: AcademicRecord
  attendance: AttendanceRecord
  faculties: Faculty
  departments: Department
  programs: Program
  courses: Course
  reports: Report
  requests: GovRequest
  transferRequests: TransferRequest
  recordRequests: RecordRequest
  recordGrants: RecordShareGrant
  consents: Consent
  campaigns: Campaign
  campaignSubmissions: CampaignSubmission
  assessmentSchemes: AssessmentScheme
  assessments: Assessment
  reportCards: ReportCard
  interventions: Intervention
  guardianLinks: GuardianLink
  timetableSlots: TimetableSlot
  applications: Application
  feeStructures: FeeStructure
  scholarships: Scholarship
  invoices: Invoice
  payments: Payment
  sessions: MentorshipSession
  conversations: Conversation
  messages: Message
  notifications: Notification
  documents: DocumentRecord
  announcements: Announcement
  credentials: Credential
  invitations: Invitation
  auditLogs: AuditLog
  settings: SettingsRecord
  authSessions: SessionRecord
}

export type CollectionName = keyof CollectionMap

/** Paginated list envelope used by every list endpoint. */
export interface Page<T> {
  rows: T[]
  total: number
  page: number
  limit: number
}
