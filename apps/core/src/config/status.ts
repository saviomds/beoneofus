// Centralised status vocabulary + badge tone. Every status label in the UI
// resolves through here so colours and wording stay consistent.

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE: Record<string, Tone> = {
  // user
  active: 'success', pending: 'warning', suspended: 'danger', inactive: 'neutral', archived: 'neutral',
  // report
  draft: 'neutral', submitted: 'info', under_review: 'warning', approved: 'success', rejected: 'danger',
  // request
  received: 'info', need_information: 'warning', in_progress: 'info', completed: 'success', cancelled: 'neutral',
  // session
  scheduled: 'info', no_show: 'danger',
  // attendance
  present: 'success', late: 'warning', absent: 'danger', excused: 'neutral',
  // documents
  verified: 'success',
  // priority
  low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger',
  // generic health
  healthy: 'success', warning: 'warning', critical: 'danger', recovery: 'warning', error: 'danger',
  issued: 'success', revoked: 'danger',
  // organizations / invitations / enrolment / transfers
  accepted: 'success', expired: 'neutral',
  graduated: 'success', withdrawn: 'neutral', transferred: 'info', initiated: 'info',
  // record requests / consent / grants
  requested: 'info', granted: 'success', partially_approved: 'success',
  more_information_required: 'warning', fulfilled: 'success',
  // government campaigns
  not_started: 'neutral', published: 'info', open: 'info',
  closing_soon: 'warning', closed: 'neutral', returned: 'warning',
}

export function toneFor(status: string): Tone {
  return TONE[status?.toLowerCase?.() ?? ''] ?? 'neutral'
}

export function labelFor(status: string): string {
  if (!status) return '—'
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const REPORT_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived'] as const
export const REQUEST_STATUSES = [
  'draft', 'submitted', 'received', 'under_review', 'need_information',
  'approved', 'rejected', 'in_progress', 'completed', 'cancelled',
] as const
export const USER_STATUSES = ['active', 'pending', 'suspended', 'inactive', 'archived'] as const
