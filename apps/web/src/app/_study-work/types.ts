// Core domain types for the Study Abroad / Work Abroad client application portal.
// This whole feature runs on frontend mock/local state (see services/) so it can
// be wired to a real backend later without touching the UI layer.

export type ApplicationType = 'study' | 'work'

// Centralized status model — every stage of the journey in one place so no
// component has to duplicate "what comes after CONFIRMED" logic. See
// lib/statusMachine.ts for ordering, labels, and per-status copy.
export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'FULL_APPLICATION'
  | 'DOCUMENT_COLLECTION'
  | 'DOCUMENT_REVIEW'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'PROCESSING'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED'

export type PassportStatus = 'HAVE_VALID' | 'PROCESSING' | 'NONE'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email: string
}

export interface PersonalInfo {
  legalFirstName: string
  middleName: string
  lastName: string
  dateOfBirth: string // ISO date
  nationality: string
  countryOfResidence: string
  city: string
  phone: string
  email: string
  address: string
  emergencyContact: EmergencyContact
}

export type EducationLevel =
  | 'Certificate'
  | 'Diploma'
  | "Bachelor's"
  | "Master's"
  | 'PhD'
  | 'Short Course'
  | 'Other'

export interface EducationRecord {
  id: string
  institution: string
  qualification: string
  fieldOfStudy: string
  startDate: string
  endDate: string
  grade: string
  country: string
}

export interface StudyDetails {
  educationLevel: EducationLevel | ''
  preferredField: string
  preferredProgram: string
  preferredInstitution: string
  preferredIntake: string
  previousEducation: EducationRecord[]
  motivation: string
  careerGoals: string
  preferredLocation: string
  budget: string
  languages: string
}

export interface EmploymentRecord {
  id: string
  company: string
  jobTitle: string
  country: string
  startDate: string
  endDate: string
  responsibilities: string
}

export interface Certification {
  id: string
  name: string
  issuingOrganization: string
  date: string
  expiryDate: string
}

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Seasonal' | 'Internship'

export interface WorkDetails {
  desiredOccupation: string
  industry: string
  skills: string
  yearsOfExperience: string
  educationLevel: EducationLevel | ''
  preferredEmploymentType: EmploymentType | ''
  expectedSalaryRange: string
  preferredLocation: string
  employmentHistory: EmploymentRecord[]
  certifications: Certification[]
}

export interface TravelInfo {
  passportStatus: PassportStatus | ''
  passportNumber: string
  issueDate: string
  expiryDate: string
  issuingCountry: string
}

export interface Application {
  id: string
  applicationNumber: string
  userId: string
  type: ApplicationType
  destination: string
  status: ApplicationStatus
  progress: number // 0-100, derived but stored for quick display
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  personal: PersonalInfo
  study: StudyDetails
  work: WorkDetails
  travel: TravelInfo
  draftStep: number // wizard step the client last saved at
}

export type RequirementStatus =
  | 'NOT_STARTED'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION'
  | 'COMPLETED'

export interface Requirement {
  id: string
  applicationId: string
  name: string
  description: string
  required: boolean
  status: RequirementStatus
  deadline: string | null
  instructions: string
}

export type DocumentStatus = 'MISSING' | 'UPLOADED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION'

export interface DocumentItem {
  id: string
  applicationId: string
  requirementId: string | null
  name: string
  description: string
  required: boolean
  status: DocumentStatus
  fileName: string | null
  uploadedAt: string | null
  reviewerComment: string | null
  acceptedFormats: string[]
  maxSizeMb: number
}

export interface FinalDocument {
  id: string
  applicationId: string
  name: string
  category: 'Admission Letter' | 'Employment Contract' | 'Permit Documents' | 'Application Documents' | 'Supporting Documents' | 'Other'
  fileName: string
  issuedAt: string
}

export interface MessageAttachment {
  name: string
  size: string
}

export interface Message {
  id: string
  conversationId: string
  sender: 'client' | 'advisor'
  senderName: string
  body: string
  attachments: MessageAttachment[]
  createdAt: string
}

export interface Conversation {
  id: string
  applicationId: string
  advisorName: string
  advisorRole: string
  lastMessageAt: string
  unread: number
}

export type NotificationType =
  | 'APPLICATION_CONFIRMED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'NEW_DOCUMENT_REQUIRED'
  | 'ADVISOR_MESSAGE'
  | 'STAGE_ADVANCED'
  | 'DEADLINE_REMINDER'

export interface NotificationItem {
  id: string
  applicationId: string | null
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type TimelineStageStatus = 'done' | 'current' | 'upcoming'

export interface TimelineEvent {
  id: string
  applicationId: string
  label: string
  description: string
  status: TimelineStageStatus
  date: string | null
}

export interface ClientUser {
  id: string
  email: string
  firstName: string
  middleName: string
  lastName: string
  phone: string
  nationality: string
  countryOfResidence: string
  dateOfBirth: string
  createdAt: string
}

export interface RegisterInput {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  countryOfResidence: string
  dateOfBirth: string
  password: string
}
