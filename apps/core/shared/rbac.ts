// ---------------------------------------------------------------------------
// Role-based access control (shared client + server).
//
// Permissions are the unit of authorisation. Roles are named bundles. Code
// checks `hasPermission(user, 'students.view')`, never `user.role === 'school'`.
// A user record may carry extra `permissions` granted by an admin.
//
// This module answers "is this ACTION allowed for this user". Whether the
// TARGET RECORD belongs to the user's tenant is a separate check — see
// server/lib/tenant.ts (`assertTenant`).
// ---------------------------------------------------------------------------

import type { Permission, Role, SafeUser } from './types'

export const ROLES: Role[] = ['student', 'teacher', 'mentor', 'guardian', 'school', 'government', 'admin']

export const PERMISSIONS = {
  // students
  STUDENTS_VIEW: 'students.view',
  STUDENTS_VIEW_OWN: 'students.view.own',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_EDIT: 'students.edit',
  STUDENTS_ARCHIVE: 'students.archive',
  STUDENTS_ASSIGN: 'students.assign',
  // enrolment / transfers
  ENROLLMENT_MANAGE: 'enrollment.manage',
  TRANSFER_INITIATE: 'transfer.initiate',
  TRANSFER_APPROVE: 'transfer.approve',
  TRANSFER_ACCEPT: 'transfer.accept',
  // inter-institution records / consent / credentials
  RECORDS_REQUEST: 'records.request',
  RECORDS_SHARE: 'records.share',
  CONSENT_MANAGE: 'consent.manage',
  CREDENTIALS_ISSUE: 'credentials.issue',
  CREDENTIALS_REVOKE: 'credentials.revoke',
  // government data campaigns
  CAMPAIGN_MANAGE: 'campaign.manage',
  CAMPAIGN_RESPOND: 'campaign.respond',
  CAMPAIGN_REVIEW: 'campaign.review',
  // teachers / mentors
  TEACHERS_VIEW: 'teachers.view',
  TEACHERS_MANAGE: 'teachers.manage',
  MENTORS_VIEW: 'mentors.view',
  MENTORS_MANAGE: 'mentors.manage',
  MENTORSHIP_CONDUCT: 'mentorship.conduct',
  // academics
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_RECORD: 'attendance.record',
  ATTENDANCE_EXCUSE: 'attendance.excuse',
  ACADEMIC_VIEW: 'academic.view',
  ACADEMIC_RECORD: 'academic.record',
  ASSESSMENT_MANAGE: 'assessment.manage',
  SCHEME_MANAGE: 'assessment.scheme.manage',
  REPORTCARD_MANAGE: 'reportcard.manage',
  REPORTCARD_PUBLISH: 'reportcard.publish',
  INTERVENTION_MANAGE: 'intervention.manage',
  CLASSES_MANAGE: 'classes.manage',
  UNIVERSITY_MANAGE: 'university.manage',
  // guardians
  GUARDIAN_LINK_MANAGE: 'guardian.link.manage',
  GUARDIAN_PORTAL: 'guardian.portal',
  // timetable / admissions / finance / operations
  TIMETABLE_MANAGE: 'timetable.manage',
  ADMISSIONS_VIEW: 'admissions.view',
  ADMISSIONS_MANAGE: 'admissions.manage',
  FINANCE_VIEW: 'finance.view',
  FINANCE_VIEW_OWN: 'finance.view.own',
  FINANCE_MANAGE: 'finance.manage',
  IMPORT_DATA: 'data.import',
  BATCH_OPERATIONS: 'operations.batch',
  // reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EDIT: 'reports.edit',
  REPORTS_APPROVE: 'reports.approve',
  // requests (school <-> government)
  REQUESTS_VIEW: 'government.requests.view',
  REQUESTS_CREATE: 'government.requests.create',
  REQUESTS_PROCESS: 'government.requests.process',
  // institution / registries
  INSTITUTION_VIEW: 'institution.view',
  INSTITUTION_EDIT: 'institution.edit',
  SCHOOLS_VIEW: 'schools.view',
  SCHOOLS_EDIT: 'schools.edit',
  GOVERNMENT_VIEW: 'government.view',
  // onboarding
  ORG_CREATE: 'org.create',
  ORG_APPROVE: 'org.approve',
  ORG_SUSPEND: 'org.suspend',
  INVITATION_CREATE: 'invitation.create',
  INVITATION_REVOKE: 'invitation.revoke',
  // communication
  MESSAGES_USE: 'messages.use',
  NOTIFICATIONS_VIEW: 'notifications.view',
  ANNOUNCEMENTS_VIEW: 'announcements.view',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_MANAGE: 'documents.manage',
  // analytics
  ANALYTICS_SCHOOL: 'analytics.school',
  ANALYTICS_GOVERNMENT: 'analytics.government',
  ANALYTICS_PLATFORM: 'analytics.platform',
  // platform administration
  USERS_MANAGE: 'users.manage',
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_HEALTH: 'system.health',
  BACKUP_MANAGE: 'backup.manage',
  AUDIT_VIEW: 'audit.view',
  AUDIT_VIEW_OWN_ORG: 'audit.view.org',
  SUPPORT_IMPERSONATE: 'support.impersonate',
} as const

type PermValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
const P = PERMISSIONS

const STUDENT: PermValue[] = [
  P.STUDENTS_VIEW_OWN, P.ACADEMIC_VIEW, P.ATTENDANCE_VIEW, P.REPORTS_VIEW,
  P.MENTORS_VIEW, P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW,
  P.DOCUMENTS_VIEW, P.REQUESTS_CREATE, P.REQUESTS_VIEW, P.INSTITUTION_VIEW,
  P.FINANCE_VIEW_OWN,
]

const TEACHER: PermValue[] = [
  P.STUDENTS_VIEW, P.TEACHERS_VIEW, P.MENTORS_VIEW,
  P.ATTENDANCE_VIEW, P.ATTENDANCE_RECORD, P.ATTENDANCE_EXCUSE, P.ACADEMIC_VIEW, P.ACADEMIC_RECORD,
  P.ASSESSMENT_MANAGE, P.CLASSES_MANAGE, P.REPORTS_VIEW, P.REPORTS_CREATE, P.REPORTS_EDIT,
  P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW,
  P.DOCUMENTS_VIEW, P.DOCUMENTS_MANAGE, P.INSTITUTION_VIEW,
]

const GUARDIAN: PermValue[] = [
  P.GUARDIAN_PORTAL, P.STUDENTS_VIEW_OWN, P.ACADEMIC_VIEW, P.ATTENDANCE_VIEW,
  P.REPORTS_VIEW, P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW, P.DOCUMENTS_VIEW,
  P.FINANCE_VIEW_OWN,
]

const MENTOR: PermValue[] = [
  P.STUDENTS_VIEW, P.MENTORS_VIEW, P.MENTORSHIP_CONDUCT, P.ACADEMIC_VIEW,
  P.ATTENDANCE_VIEW, P.REPORTS_VIEW, P.REPORTS_CREATE, P.REPORTS_EDIT,
  P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW, P.DOCUMENTS_VIEW,
]

/** The single institution-admin account (role: 'school'). */
const SCHOOL: PermValue[] = [
  P.STUDENTS_VIEW, P.STUDENTS_CREATE, P.STUDENTS_EDIT, P.STUDENTS_ARCHIVE, P.STUDENTS_ASSIGN,
  P.ENROLLMENT_MANAGE, P.TRANSFER_INITIATE, P.TRANSFER_ACCEPT,
  P.RECORDS_REQUEST, P.RECORDS_SHARE, P.CONSENT_MANAGE,
  P.CREDENTIALS_ISSUE, P.CREDENTIALS_REVOKE, P.CAMPAIGN_RESPOND,
  P.TEACHERS_VIEW, P.TEACHERS_MANAGE, P.MENTORS_VIEW, P.MENTORS_MANAGE,
  P.ATTENDANCE_VIEW, P.ATTENDANCE_RECORD, P.ATTENDANCE_EXCUSE, P.ACADEMIC_VIEW, P.ACADEMIC_RECORD,
  P.ASSESSMENT_MANAGE, P.SCHEME_MANAGE, P.REPORTCARD_MANAGE, P.REPORTCARD_PUBLISH,
  P.INTERVENTION_MANAGE, P.GUARDIAN_LINK_MANAGE, P.TIMETABLE_MANAGE,
  P.ADMISSIONS_VIEW, P.ADMISSIONS_MANAGE, P.FINANCE_VIEW, P.FINANCE_MANAGE,
  P.IMPORT_DATA, P.BATCH_OPERATIONS,
  P.CLASSES_MANAGE, P.UNIVERSITY_MANAGE,
  P.REPORTS_VIEW, P.REPORTS_CREATE, P.REPORTS_EDIT, P.REPORTS_APPROVE,
  P.REQUESTS_VIEW, P.REQUESTS_CREATE,
  P.INSTITUTION_VIEW, P.INSTITUTION_EDIT, P.SCHOOLS_VIEW, P.SCHOOLS_EDIT, P.GOVERNMENT_VIEW,
  P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW, P.ANNOUNCEMENTS_CREATE,
  P.DOCUMENTS_VIEW, P.DOCUMENTS_MANAGE, P.ANALYTICS_SCHOOL, P.AUDIT_VIEW_OWN_ORG,
]

const GOVERNMENT: PermValue[] = [
  P.SCHOOLS_VIEW, P.GOVERNMENT_VIEW, P.TEACHERS_VIEW, P.MENTORS_VIEW, P.INSTITUTION_VIEW,
  P.REPORTS_VIEW, P.REPORTS_APPROVE,
  P.REQUESTS_VIEW, P.REQUESTS_PROCESS,
  P.ORG_APPROVE, P.INVITATION_CREATE, P.INVITATION_REVOKE, P.TRANSFER_APPROVE,
  P.CAMPAIGN_MANAGE, P.CAMPAIGN_REVIEW,
  P.MESSAGES_USE, P.NOTIFICATIONS_VIEW, P.ANNOUNCEMENTS_VIEW, P.ANNOUNCEMENTS_CREATE,
  P.DOCUMENTS_VIEW, P.ANALYTICS_GOVERNMENT, P.AUDIT_VIEW_OWN_ORG,
]

const ADMIN: PermValue[] = [
  ...new Set<PermValue>([
    ...STUDENT, ...TEACHER, ...MENTOR, ...GUARDIAN, ...SCHOOL, ...GOVERNMENT,
    P.USERS_MANAGE, P.SYSTEM_SETTINGS, P.SYSTEM_HEALTH, P.BACKUP_MANAGE,
    P.AUDIT_VIEW, P.SUPPORT_IMPERSONATE, P.ANALYTICS_PLATFORM,
    P.ORG_CREATE, P.ORG_APPROVE, P.ORG_SUSPEND, P.INVITATION_CREATE, P.INVITATION_REVOKE,
    P.TRANSFER_APPROVE,
  ]),
]

export const ROLE_PERMISSIONS: Record<Role, PermValue[]> = {
  student: STUDENT,
  teacher: TEACHER,
  mentor: MENTOR,
  guardian: GUARDIAN,
  school: SCHOOL,
  government: GOVERNMENT,
  admin: ADMIN,
}

export function permissionsFor(user: Pick<SafeUser, 'role' | 'permissions'> | null): Set<Permission> {
  if (!user) return new Set()
  return new Set<Permission>([...(ROLE_PERMISSIONS[user.role] ?? []), ...(user.permissions ?? [])])
}

export function hasPermission(
  user: Pick<SafeUser, 'role' | 'permissions'> | null,
  permission: Permission,
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return permissionsFor(user).has(permission)
}

export function hasAnyPermission(
  user: Pick<SafeUser, 'role' | 'permissions'> | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(user, p))
}

export class AuthorizationError extends Error {
  code = 'FORBIDDEN'
  status = 403
  constructor(permission: Permission) {
    super(`Not authorized: ${permission} is required for this action.`)
    this.name = 'AuthorizationError'
  }
}

export function assertPermission(
  user: Pick<SafeUser, 'role' | 'permissions'> | null,
  permission: Permission,
): void {
  if (!hasPermission(user, permission)) throw new AuthorizationError(permission)
}
