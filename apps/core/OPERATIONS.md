# School Operations — Timetable, Admissions, Finance, Bulk Import, Year-End, PDF

Tranche C. All `school`-scoped (admin passes through); students/guardians get a
read-only finance view of their own invoices.

## Timetable

`data/timetableSlots.json` · `server/services/timetableService.ts`

```
TimetableSlot { classId, dayOfWeek (1–5), period (1..n),
                startTime, endTime, subjectId, teacherId, room }
```

`POST /timetable` rejects a class clash (same day+period) and a teacher clash
(same teacher, same day+period across classes). `GET /classes/:id/timetable` and
`GET /teachers/:id/timetable` return the grid.

**Wired to attendance**: `POST /classes/:id/attendance {date, entries, period}` —
when `period > 0` and no `subjectId` is given, the subject is resolved from the
timetable slot for that weekday + period.

## Admissions

`data/applications.json` · `server/services/admissionService.ts`

```
DRAFT → SUBMITTED → UNDER_REVIEW → SHORTLISTED ─┬─→ OFFERED → OFFER_ACCEPTED → ENROLLED
                                                ├─→ WAITLISTED
                                                └─→ REJECTED            (WITHDRAWN any time before ENROLLED)
```

- `POST /applications` (with `submit: true` to skip DRAFT) ·
  `POST /applications/:id/review {decision: start_review|shortlist|offer|reject|waitlist, note?, assessmentScore?, offerDays?}` ·
  `POST /applications/:id/accept-offer` · `POST /applications/:id/withdraw`
- `POST /applications/:id/enroll {classId?, academicYear?}` — converts to a real
  enrolment via `studentService.create` (Student + User + initial `Enrollment`).
  **Idempotent**: guarded by `application.studentId`, so a second call returns the
  same student — no duplicate identity.

Every transition is timelined and audited.

## Finance

`data/{feeStructures,scholarships,invoices,payments}.json` ·
`server/services/financeService.ts`

- **Fee structure** — named set of `{label, amount}` items per level/year; `total`
  is derived.
- **Scholarship** — `percentage` (0–100) or `fixed`; applied as a discount when
  an invoice cites it.
- **Invoice** — `POST /finance/invoices {studentId, feeStructureId | lineItems, term, discount?, scholarshipId?}`.
  `total = gross − discount`; status is derived: `PENDING → PARTIALLY_PAID → PAID`,
  or `OVERDUE` past `dueDate`; `CANCELLED` / `REFUNDED` are terminal.
- **Payment** — `POST /finance/payments {invoiceId, amount, method, reference?}`.
  **No payment gateway** — payments are recorded manually by a finance officer;
  a `RCPT-…` receipt number is generated, the invoice's `paidAmount`/`status`
  update, the student is notified. **Overpaying the balance is rejected.**
- `GET /finance/summary` — billed / collected / outstanding / overdue count.
- **Students and guardians** (`finance.view.own`) see only their own / their
  children's invoices and payment history — `GET /finance/invoices`,
  `GET /finance/invoices/:id` (404 for anyone else's).

## Bulk import

`server/services/importService.ts` · CSV, kinds `students | teachers | guardians`

```
paste / upload CSV
     │
POST /import/:kind/validate  → per-row report {ok, errors[], warnings[]}
                                (missing required fields, duplicate rows,
                                 invalid email, existing account, unknown student…)
     │  (review the report)
POST /import/:kind/commit    → creates the VALID rows only, one at a time
                                → report {created, failed, rows[] with created + id}
```

A failed row never blocks or corrupts the others — each entity create is its own
atomic write, and the report says exactly what happened to every row. `guardians`
import links to an existing student by `student_number` and reuses/creates the
guardian account. Audited as `BULK_IMPORT`.

CSV templates are offered in the UI (`/school/import`).

## Year-end batch

`server/services/batchService.ts` · `/school/year-end`

- `POST /batch/promotion/preview {classId | gradeLevel}` — every active student
  with their proposed next grade (from the standard grade ladder); students at the
  top of a ladder are marked `graduate`.
- `POST /batch/promotion/commit {classId, toAcademicYear, overrides?}` — promotes
  / graduates each (overrides per student: `promote|graduate|hold`). Uses
  `enrollmentService.promote` / `.graduate`, so history is retained.
- `POST /batch/graduation/{preview,commit}` — graduate a whole cohort.
- `POST /batch/archive-class {classId}` — closes the class's active enrolments
  `COMPLETED` and sets the class `archived`.

Preview → confirm (typed browser confirm) → audited (`BATCH_PROMOTION`,
`BATCH_GRADUATION`, `CLASS_ARCHIVED`).

## PDF export

`server/lib/pdf.ts` (pdfkit — pure JS, no native deps).

- `GET /report-cards/:id/pdf` — the report card as a laid-out A4 PDF (subjects,
  component breakdown, weighted score, grade, positions, GPA, attendance,
  remarks). Passes the same visibility gate as the JSON endpoint.
- `GET /students/:id/transcript.pdf` — the full cumulative transcript.

Both stream `application/pdf`, and each export writes a `REPORT_CARD_EXPORTED` /
`TRANSCRIPT_EXPORTED` audit event.

## Permissions

`timetable.manage` · `admissions.view` / `admissions.manage` · `finance.view` /
`finance.manage` · `finance.view.own` (student + guardian) · `data.import` ·
`operations.batch` — all institution-level on `school`.

## Tests

`server/test/operations.test.ts` — timetable slot → attendance subject
resolution + clash guard; application → offer → enrol creating exactly one
student (idempotent); invoice total / partial → paid / overpay-guard / student
visibility; CSV validate-then-commit only valid rows + duplicate-email rejection;
batch promotion advancing a class and graduating the ladder top; report-card and
transcript PDFs returning real `%PDF-` bytes with an audit trail.
