# Student Lifecycle

`student.classId` / `gradeLevel` are **derived** from the active enrolment — they
are conveniences, not the source of truth. History is never overwritten (spec §9,
§15, §44, §47).

## Records

- `Student` — identity: `id` (`BOU-STU-RW-2026-000001`),
  `institutionStudentNumber` (the school's own number), guardian, contact, skills.
- `Enrollment` — `id` (`ENR-2026-000001`), `organizationId`, `academicYear`,
  `level`, `gradeLevel`, `classId`, `studyCode`, `status`
  (`ACTIVE | COMPLETED | TRANSFERRED | GRADUATED | WITHDRAWN`), `startDate`,
  `endDate`. **Exactly one `ACTIVE` per student.**

## Operations (`server/services/enrollmentService.ts`, `transferService.ts`)

| Action | Effect |
|---|---|
| **Create student** (`POST /api/students`) | creates the `User` + `Student` + an initial `ACTIVE` enrolment; auto-generates the BOU student code + a school student number. |
| **Enroll / re-enroll** (`POST /api/enrollments`) | closes the current `ACTIVE` enrolment as `COMPLETED`, opens a new `ACTIVE` one. |
| **Promote** | `enroll` at the next grade, same level/study code, note "Promoted from …". |
| **Graduate** (`POST /api/students/:id/graduate`) | active enrolment → `GRADUATED`, student → `inactive`. Records stay readable. |
| **Withdraw** | active enrolment → `WITHDRAWN` (+ reason), student → `inactive`. |
| **Assign class** | updates the student *and* the active enrolment's `classId`, and both class rosters. |
| **Archive** | soft delete (`status: 'archived'`); nothing is destroyed. |

## Transfer between institutions (`TransferRequest`)

```
School A:  POST /api/transfers { studentId, toOrganizationId, reason, targetLevel, targetAcademicYear }
             status INITIATED  → destination notified
(authorized): POST /api/transfers/:id/approve      → APPROVED
School B:  POST /api/transfers/:id/accept
             → active enrolment at A closed as TRANSFERRED (endDate set)
             → new ACTIVE enrolment created at B
             → student.organizationId + user.organizationId moved to B
             → class / teacher / mentor cleared (re-assigned at B)
             → status COMPLETED, both institutions notified, audited
School A can also POST /api/transfers/:id/cancel while still INITIATED.
```

The student's **full enrolment history** (S4 at A, S5 at A, S6 at B, …) remains
on the `enrollments` collection and is shown on the student's Academic page and
via `GET /api/students/:id/enrollments`.

## UI

- **School → Students**: add, edit, assign, archive; graduate/withdraw via the
  enrolment actions.
- **School → Transfers**: outgoing / incoming queues, initiate, accept, cancel,
  timeline.
- **Student → Academic**: grades, per-subject chart; enrolment history.
