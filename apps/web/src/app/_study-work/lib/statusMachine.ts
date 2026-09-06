import type { Application, ApplicationStatus, RequirementStatus, DocumentStatus } from '../types'

// Single source of truth for the application journey. Every page that needs to
// know "what stage is this", "what % progress", "what color badge", or "what
// should the client do next" reads from here instead of re-deriving it.

export const STATUS_ORDER: ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CONFIRMED',
  'FULL_APPLICATION',
  'DOCUMENT_COLLECTION',
  'DOCUMENT_REVIEW',
  'PROCESSING',
  'APPROVED',
  'COMPLETED',
]

interface StatusMeta {
  label: string
  shortLabel: string
  description: string
  badgeTone: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  progress: number
}

const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft', shortLabel: 'Draft',
    description: 'Your application has not been submitted yet.',
    badgeTone: 'neutral', progress: 5,
  },
  SUBMITTED: {
    label: 'Submitted', shortLabel: 'Submitted',
    description: 'Your application has been received.',
    badgeTone: 'info', progress: 15,
  },
  UNDER_REVIEW: {
    label: 'Under Review', shortLabel: 'Under Review',
    description: 'Your application is currently being reviewed by our team.',
    badgeTone: 'warning', progress: 25,
  },
  CONFIRMED: {
    label: 'Application Confirmed', shortLabel: 'Confirmed',
    description: 'Your application has been confirmed — you can continue to the next stage.',
    badgeTone: 'success', progress: 40,
  },
  FULL_APPLICATION: {
    label: 'Full Application', shortLabel: 'In Progress',
    description: 'Complete your personal, education/work, and travel details.',
    badgeTone: 'info', progress: 50,
  },
  DOCUMENT_COLLECTION: {
    label: 'Document Collection', shortLabel: 'Collecting Docs',
    description: 'Upload the documents required for your application.',
    badgeTone: 'info', progress: 65,
  },
  DOCUMENT_REVIEW: {
    label: 'Document Review', shortLabel: 'Docs in Review',
    description: 'Our team is verifying your uploaded documents.',
    badgeTone: 'warning', progress: 75,
  },
  ADDITIONAL_INFORMATION_REQUIRED: {
    label: 'Additional Information Required', shortLabel: 'Action Needed',
    description: 'We need a bit more information or a correction from you.',
    badgeTone: 'danger', progress: 75,
  },
  PROCESSING: {
    label: 'Processing', shortLabel: 'Processing',
    description: 'Your application is being processed.',
    badgeTone: 'info', progress: 85,
  },
  APPROVED: {
    label: 'Approved', shortLabel: 'Approved',
    description: 'Your application has been approved.',
    badgeTone: 'success', progress: 95,
  },
  COMPLETED: {
    label: 'Completed', shortLabel: 'Completed',
    description: 'Your application is complete — your document package is ready.',
    badgeTone: 'success', progress: 100,
  },
  REJECTED: {
    label: 'Rejected', shortLabel: 'Rejected',
    description: 'Your application was not approved.',
    badgeTone: 'danger', progress: 100,
  },
}

export function statusMeta(status: ApplicationStatus): StatusMeta {
  return STATUS_META[status]
}

export function statusProgress(status: ApplicationStatus): number {
  return STATUS_META[status].progress
}

/** Has the client been unlocked into the full post-confirmation portal yet? */
export function isConfirmedOrLater(status: ApplicationStatus): boolean {
  const idx = STATUS_ORDER.indexOf(status)
  const confirmedIdx = STATUS_ORDER.indexOf('CONFIRMED')
  return status === 'ADDITIONAL_INFORMATION_REQUIRED' || (idx >= 0 && idx >= confirmedIdx)
}

export function isTerminal(status: ApplicationStatus): boolean {
  return status === 'COMPLETED' || status === 'REJECTED'
}

/** What should the client see as their single most important next action? */
export function nextAction(app: Application, docsSummary: { missing: number; needsCorrection: number }): { title: string; href: string } | null {
  switch (app.status) {
    case 'DRAFT':
      return { title: 'Continue your application', href: `/apply/wizard/${app.id}` }
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return null // nothing actionable — waiting on us
    case 'CONFIRMED':
      return { title: 'Continue your application', href: `/apply/dashboard/application/${app.id}` }
    case 'FULL_APPLICATION':
      return { title: 'Complete your personal & education/work details', href: `/apply/dashboard/application/${app.id}/personal` }
    case 'ADDITIONAL_INFORMATION_REQUIRED':
      return { title: 'Review the correction requested on your documents', href: `/apply/dashboard/application/${app.id}/documents` }
    case 'DOCUMENT_COLLECTION':
    case 'DOCUMENT_REVIEW':
      if (docsSummary.needsCorrection > 0) {
        return { title: 'Fix a document that needs correction', href: `/apply/dashboard/application/${app.id}/documents` }
      }
      if (docsSummary.missing > 0) {
        return { title: `Upload ${docsSummary.missing} remaining document${docsSummary.missing === 1 ? '' : 's'}`, href: `/apply/dashboard/application/${app.id}/documents` }
      }
      return null
    case 'PROCESSING':
      return null
    case 'APPROVED':
      return { title: 'View your completed document package', href: `/apply/dashboard/application/${app.id}/final-documents` }
    case 'COMPLETED':
      return { title: 'Download your final document package', href: `/apply/dashboard/application/${app.id}/final-documents` }
    case 'REJECTED':
      return { title: 'Contact your advisor about this decision', href: `/apply/dashboard/messages` }
    default:
      return null
  }
}

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  NOT_STARTED: 'Not Started',
  UPLOADED: 'Uploaded',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_CORRECTION: 'Needs Correction',
  COMPLETED: 'Completed',
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  MISSING: 'Missing',
  UPLOADED: 'Uploaded',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_CORRECTION: 'Needs Correction',
}

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export function requirementTone(status: RequirementStatus): BadgeTone {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED': return 'success'
    case 'REJECTED':
    case 'NEEDS_CORRECTION': return 'danger'
    case 'UNDER_REVIEW': return 'warning'
    case 'UPLOADED': return 'info'
    default: return 'neutral'
  }
}

export function documentTone(status: DocumentStatus): BadgeTone {
  switch (status) {
    case 'APPROVED': return 'success'
    case 'REJECTED':
    case 'NEEDS_CORRECTION': return 'danger'
    case 'UNDER_REVIEW': return 'warning'
    case 'UPLOADED': return 'info'
    default: return 'neutral'
  }
}
