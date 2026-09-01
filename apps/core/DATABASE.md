# Database

A set of JSON collections on the server's filesystem under `/data`, each file:

```json
{ "schema": 3, "version": 42, "checksum": "<sha256 of rows>", "updatedAt": "…", "rows": [ … ] }
```

`server/lib/db.ts` is the only place a concrete engine is named. Swap
`FileRepository` for `SqlRepository` (same `Repository<T>` interface) to move to
Postgres — nothing else changes. See [MIGRATION.md](./MIGRATION.md).

## Collections

`organizations, users, students, teachers, mentors, mentorAssignments, classes,
subjects, enrollments, academicRecords, attendance, faculties, departments,
programs, courses, reports, requests, transferRequests, sessions, conversations,
messages, notifications, documents, announcements, credentials, invitations,
auditLogs, settings, authSessions`

### Key relationships (IDs only, no duplication)

| From | → | Via |
|---|---|---|
| `users.organizationId` | `organizations.id` | tenant membership |
| `students.{organizationId, userId, classId, teacherId, mentorId}` | orgs / users / classes / teachers / mentors | |
| `enrollments.{studentId, organizationId, classId}` | student history (one ACTIVE at a time) | |
| `classes.{organizationId, homeroomTeacherId, subjectIds[], studentIds[]}` | | |
| `academicRecords / attendance .{studentId, organizationId, subjectId, classId}` | | |
| `faculties → departments → programs → courses` | `.facultyId / .departmentId / .programId` + `.organizationId` | universities |
| `reports.{organizationId, authorId, targetUserId}` · `requests.{organizationId, assignedOfficerId}` | | |
| `transferRequests.{studentId, fromOrganizationId, toOrganizationId}` | | |
| `invitations.organizationId` | set once accepted | |

## Identifiers (spec §42–43)

- Students: `BOU-STU-RW-2026-000001` (`server/lib/codes.ts`, collision-checked, never reused).
- Organizations: `ORG-RW-SCH-000001`.
- Classes: `S3-A-MPC-2026` (`grade-section-studyCode-year`).
- References: `RPT-2026-00031`, `REQ-2026-00042`, `INV-2026-00001`, `ENR-2026-000001`, `TRF-2026-000001`.
- Runtime rows without an explicit id: `<PREFIX>_<nanoid>`.

## Versioning & concurrency (spec §24, §33)

Every record has `version: number`. `repo.update(id, patch, { expectedVersion })`
throws `ConflictError` (**409**) if the stored version differs, so a second
editor working from stale data cannot silently overwrite the first. Writes are
serialised per collection by an in-process mutex.

## Writes (spec §22)

`FileStore.mutate()`: acquire mutex → read rows → apply mutation → append journal
entry `{ txId, op, collection, recordId, before, after, status:'pending' }` →
write `<file>.tmp` → `fsync` → `rename` (atomic) → journal `committed`. On a
write error the prior rows are restored and the entry marked `rolledback`.

## Editing seed data

Do **not** hand-edit `server/data/seed/*.json`. Edit
`server/scripts/generate-seed.ts` and run `npm run seed`. It also owns the demo
password hash (scrypt, fixed salt) so it stays consistent with the login path.

## Reset / export

There is no "reset on restart". Controlled operations live under
`/api/system/*` (admin only): create backup, restore backup (typed confirm +
auto safety backup), re-run integrity check. To start completely fresh in dev:
stop the server, `rm -rf data`, start again (re-seeds).
