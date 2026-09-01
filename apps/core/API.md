# API Reference

All routes are under `/api`. Auth is a session cookie (`bou_sid`). Responses are
`{ "data": … }` on success or `{ "error": { "code", "message", "details?" } }`
with an HTTP status (401/403/404/409/422/429/500). The client `src/lib/api.ts`
turns errors into `ApiError`.

## Auth (public)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ code, password }` → `AuthPayload`; sets cookie |
| POST | `/auth/logout` | clears cookie |
| GET | `/auth/me` | current `AuthPayload` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` |
| POST | `/auth/rotate-code` | → `{ code }` |
| POST | `/auth/support-view` | admin; `{ targetId }` |
| POST | `/auth/end-support-view` | |
| POST | `/auth/forgot-password` | `{ code }` → `{ token, delivered:false }` |

## Onboarding (public)
| GET | `/invite/:token` | → `PublicInvitation` |
| POST | `/invite/:token/accept` | `{ password, representativeName, … }` → `{ organization, adminCode }` |

## Credential verification (public)
| GET | `/verify/:code` | → `{ valid, status, credentialTitle, credentialType, holderName, issuerName, issuedDate, verificationCode }`. No auth. Returns only these fields — never grades, contact details, documents or guardians. Unknown code → `{ valid: false }`. |

## Everything below requires a session

### Organizations / invitations
`GET /organizations` · `GET /organizations/mine` · `GET /organizations/:id` ·
`PATCH /organizations/:id` · `POST /organizations/:id/status {status}` ·
`POST /admin/organizations` ·
`GET /invitations` · `POST /invitations` · `POST /invitations/:id/revoke`

### Students & enrolment
`GET /students?page&limit&search&status&classId&gradeLevel` ·
`GET /students/me` · `GET /students/:id` ·
`GET /students/:id/{academic,attendance,attendance-rate,average,reports,credentials,sessions,enrollments,progress}` ·
`POST /students` · `PATCH /students/:id` · `POST /students/:id/archive` ·
`POST /students/:id/assign {classId|teacherId|mentorId}` ·
`POST /students/:id/graduate` · `POST /students/:id/withdraw` ·
`POST /enrollments` · `POST /enrollments/promote`

### Transfers
`GET /transfers` · `GET /transfers/destinations` · `POST /transfers` ·
`POST /transfers/:id/:action` (`approve|reject|accept|cancel`).
Accepting a transfer also creates a `STUDENT_TRANSFER` `RecordShareGrant` so the
receiving institution can read the origin's records (which keep their original
`organizationId`).

### Inter-institution records / consent / credentials
`GET /record-requests` → `{ outgoing, incoming, all }` ·
`GET /record-requests/sources` · `GET /record-requests/:id` ·
`POST /record-requests {studentId, sourceOrganizationId, requestedRecordTypes[], purpose, legalBasis}` ·
`POST /record-requests/:id/review {decision: approve|partial|reject|need_info, approvedRecordTypes?, consentId?, legalBasis?, expiresInDays?, note?}` ·
`POST /record-requests/:id/revoke {note}` ·
`GET /consents` · `GET /consents/:id` ·
`POST /consents {studentId, requestingOrganizationId, scopeRecordTypes[], grantedByName, grantedByRelationship, purpose, legalBasis, expiresAt?}` ·
`POST /consents/:id/withdraw {note}` (revokes any grant that relied on it) ·
`GET /credentials` · `POST /credentials {studentId, title, type, issuedDate?}` ·
`POST /credentials/:id/revoke {reason}`

Cross-institution reads: once a request is `APPROVED`/`PARTIALLY_APPROVED`, the
requesting institution may call the normal `GET /students/:id/{academic,attendance,
reports,credentials,enrollments}` endpoints for that student — the record gate
allows it while an **active, unexpired, unrevoked** grant covers the record type.

### Weighted assessments / report cards / transcripts
`GET|POST /academic/schemes` · `PATCH /academic/schemes/:id`
(components' weights must sum to 100) ·
`GET|POST /assessments` · `POST /assessments/bulk {entries[]}` ·
`GET /students/:id/assessments` ·
`POST /report-cards/compute {studentId, classId, term, academicYear}` (preview) ·
`POST /report-cards/generate {classId, term, academicYear}` (school) ·
`GET /report-cards?classId&term&status` · `GET /students/:id/report-cards`
(student/guardian: published only) · `GET|PATCH /report-cards/:id` ·
`POST /report-cards/:id/publish` ·
`GET /students/:id/transcript`

### Report card / transcript PDF (streamed, audited)
`GET /report-cards/:id/pdf` · `GET /students/:id/transcript.pdf` → `application/pdf`

### Timetable
`GET /classes/:id/timetable` · `GET /teachers/:id/timetable` ·
`POST /timetable {classId, dayOfWeek 1-5, period, startTime, endTime, subjectId?, teacherId?, room?}` ·
`PATCH|DELETE /timetable/:id`.
`POST /classes/:id/attendance` now accepts `period` — the subject is resolved from
the matching slot.

### Admissions
`GET /applications?status&intakeYear` · `GET /applications/:id` ·
`POST /applications {applicantFirstName, applicantLastName, gradeApplyingFor, level, …, submit?}` ·
`POST /applications/:id/submit` ·
`POST /applications/:id/review {decision: start_review|shortlist|offer|reject|waitlist, note?, offerDays?}` ·
`POST /applications/:id/accept-offer` · `POST /applications/:id/withdraw` ·
`POST /applications/:id/enroll {classId?, academicYear?}` (idempotent — creates the student once)

### Finance
`GET /finance/summary` · `GET|POST /finance/fee-structures` ·
`GET|POST /finance/scholarships` ·
`GET /finance/invoices?studentId&status` (student/guardian: own only) ·
`GET /finance/invoices/:id` · `POST /finance/invoices {studentId, feeStructureId|lineItems, term, discount?, scholarshipId?}` ·
`POST /finance/invoices/:id/status {status: CANCELLED|REFUNDED}` ·
`POST /finance/payments {invoiceId, amount, method, reference?}` (manual; generates a receipt; overpay → 422)

### Bulk import / year-end batch
`POST /import/:kind/validate {csv}` · `POST /import/:kind/commit {csv}`
(`kind` = students|teachers|guardians) ·
`POST /batch/promotion/preview {classId|gradeLevel}` ·
`POST /batch/promotion/commit {classId|gradeLevel, toAcademicYear, overrides?}` ·
`POST /batch/graduation/{preview,commit}` · `POST /batch/archive-class {classId}`

### Attendance excuses / interventions
`POST /classes/:id/attendance` now takes `{date, entries[], period?, subjectId?}` ·
`POST /attendance/:id/excuse {reason}` (student or linked guardian) ·
`GET /attendance/excuses/pending` · `POST /attendance/:id/excuse/review {decision: approve|reject, note}` ·
`GET /interventions?studentId&status&kind` · `GET /interventions/:id` ·
`POST /interventions {studentId, kind, reason, assignedTo?}` ·
`POST /interventions/:id/advance {status?, assignedTo?, note?}`
(attendance interventions also open automatically below the institution's threshold)

### Guardians
`GET /guardian/children` · `GET /guardian/children/:id` ·
`POST /guardian/attendance/:id/excuse {reason}` ·
`GET /guardians/links?studentId` ·
`POST /guardians/links {studentId, guardianCode? | name+email?, relationship, canViewRecordTypes[]}` ·
`PATCH /guardians/links/:id` · `POST /guardians/links/:id/revoke`

### Government data campaigns
`GET /campaigns` · `GET /campaigns/:id` ·
`POST /campaigns {title, description?, fields[], audienceOrganizationTypes?, dueAt}` (gov) ·
`PATCH /campaigns/:id` (draft only) · `POST /campaigns/:id/publish` ·
`POST /campaigns/:id/close` · `GET /campaigns/:id/dashboard` ·
`GET /campaigns/:id/submissions` ·
`GET /campaigns/:id/submission` (institution) ·
`PUT /campaigns/:id/submission {data}` · `POST /campaigns/:id/submit` ·
`POST /campaign-submissions/:id/review {decision: approve|return, note}`

### Teachers / mentors / classes / subjects
`GET|POST /teachers` · `GET|PATCH /teachers/:id` · `GET /teachers/:id/students` ·
`GET /teachers/me` · `GET /mentors` · `GET /mentorship/{mine,mentees,sessions}` ·
`POST /mentorship/sessions` · `PATCH /mentorship/sessions/:id` ·
`GET|POST /classes` · `GET|PATCH /classes/:id` · `GET /classes/:id/{roster,attendance}` ·
`POST /classes/:id/attendance` · `GET|POST /subjects` · `POST /academic`

### University
`GET|POST /university/{faculties,departments,programs,courses}` (departments/programs/courses accept a parent id query)

### Reports / requests / announcements / documents
`GET /reports?page&status&type` · `GET /reports/pending` · `GET /reports/:id` ·
`POST /reports` · `PATCH /reports/:id` · `POST /reports/:id/{submit,review}` ·
`GET /requests` · `GET /requests/officers` · `GET /requests/:id` · `POST /requests` ·
`POST /requests/:id/advance {action,note,officerId?,response?}` ·
`GET /announcements` · `GET /announcements/authored` · `POST /announcements` ·
`POST /announcements/:id/pin` · `DELETE /announcements/:id` ·
`GET|POST /documents` · `POST /documents/:id/status` · `DELETE /documents/:id`

### Communication / misc
`GET /notifications` · `GET /notifications/unread-count` ·
`POST /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications/:id` ·
`GET /messages/{contacts,conversations,conversations/:id}` ·
`POST /messages/conversations` · `POST /messages/conversations/:id` ·
`GET|PUT /settings` · `GET /search?q` · `GET /directory/names?ids=`

### Analytics / audit
`GET /analytics/{institution,government,platform}` · `GET /audit`

### Admin
`GET /admin/users?page&role&status&search` · `GET /admin/users/counts` ·
`GET /admin/users/:id` · `POST /admin/users` · `PATCH /admin/users/:id` ·
`POST /admin/users/:id/status` · `GET /admin/role-permissions/:role` ·
`POST /admin/broadcast {audience,title,message}`

### System (admin, `system.health` / `backup.manage`)
`GET /system/health` · `POST /system/recheck` · `GET /system/backups` ·
`POST /system/backups {label}` · `POST /system/restore {backupId, confirm:"RESTORE"}`
