# Testing

```bash
npm test        # tsx --test server/test/*.test.ts   (Node's built-in test runner)
```

Each test file runs its own in-process server on an isolated temp `BOU_DATA_DIR`
(`platform`, `network`, `academics`, `operations`). 49 cases, all passing.

## Coverage

### Authentication
- every demo account signs in
- bad password rejected, no session leaked
- **government access code rotates on every sign-in**; the previous code stops working
- **account locks after 5 failed sign-ins**

### Tenant isolation (spec §60)
- School A sees only ORG-001 students
- School A `GET /students/<School B id>` → **403 TENANT_FORBIDDEN**
- School A cannot read a School B report or list users
- School A and School B student sets are **disjoint**
- a student can read only their own records
- the university tenant is fully independent
- admin sees across every tenant

### Data integrity (spec §61–63)
- corrupting a collection file → recovery restores it from backup on next boot
- an abandoned `.tmp` write leaves the previous valid file intact (atomic rename)
- the journal records every write; no dangling transactions
- **a stale `expectedVersion` update → 409, no lost write**
- duplicate id on create does not corrupt the store

### Backup / restore (spec §62)
- backup → mutate → restore returns the original data
- a `pre-restore` safety backup is created automatically
- restore requires the exact `"RESTORE"` confirmation string (else 422)

### Onboarding (spec §5, §65)
- pending invitation resolvable by token → accept → org PENDING → admin approves → first sign-in works
- the invitation token is single-use
- an already-accepted / expired token is rejected
- a new institution admin cannot sign in while the org is PENDING

### Cross-portal workflow (spec §27, §65)
- teacher report → school approval → student notification
- school request → government response (with timeline + official response) → school notified

### Operations (`operations.test.ts`)
- a timetable slot supplies the subject for period-level attendance; class/teacher clashes rejected
- application → offer → **enrol creates exactly one student** (idempotent on repeat)
- invoice total from a fee structure; partial payment → `PARTIALLY_PAID` → `PAID`; **overpay → 422**; student sees own invoice, another student 404
- CSV import validates row-by-row and commits **only the valid rows**; duplicate teacher email rejected
- batch promotion advances a class and graduates the top of the grade ladder
- report card + transcript export as real `%PDF-` bytes with a `REPORT_CARD_EXPORTED` audit event

### Academics & guardians (`academics.test.ts`)
- weighted report card math (CA·.3 + Mid·.3 + Final·.4) and class position ranking
- draft report card hidden from student/guardian; published one visible; transcript aggregates it
- grading-scheme component weights must total 100 (422)
- repeated unexcused absences **auto-open** an attendance intervention below the threshold
- excuse workflow: student requests → school approves → status `excused`
- a guardian sees exactly their linked children across two institutions, 403 on an unrelated student, 403 on institution-only endpoints, and can request an excuse for a linked child
- after a transfer the origin institution keeps read access to the records **it** created (scoped to its own org rows)

### Inter-institution connectivity (`network.test.ts`)
- public credential verification works with no auth and leaks no PII beyond the holder's name
- unknown verification code → `{ valid: false }`, not an error
- issue → revoke is reflected by the public verifier
- one school cannot issue a credential for another school's student
- a School A student's records stay 403 for School B until a request is **approved**, then become readable, then **403 again** after revoke
- a school cannot review its own outgoing request (it is not the record holder)
- withdrawing the consent behind an approval voids the access
- an **expired** grant no longer confers access
- an accepted transfer creates a `STUDENT_TRANSFER` grant; the receiver can read the origin's academic history
- a government campaign publishes to institutions, collects a submission, reports completion on the dashboard, and can be approved
- a school not in the audience cannot submit; required fields are enforced (422)

## Manual / browser

A CDP script (`scratchpad/ui-smoke.mjs`) drives the built client through all
**74 routes** across the 6 portal contexts (student, teacher, school, university,
government, admin) against the live API and asserts every page renders with
content and zero console errors.

## Adding tests

Add cases to `server/test/platform.test.ts`. Use the `call(method, path, body)`
helper (cookie-aware) and `login(code)`. Government logins update the module's
`govCode` tracker since the code rotates.
