# Multi-Tenancy

BeOneOfUs is **not** one school app with different logins. Every institution is
an independent tenant.

## The tenant model

- `Organization` is the tenant root: `id` like `ORG-RW-SCH-000001`,
  `organizationType` (SCHOOL | UNIVERSITY | COLLEGE | TRAINING_CENTER |
  GOVERNMENT_INSTITUTION | OTHER), `institutionLevels`, `status`
  (PENDING | ACTIVE | SUSPENDED | ARCHIVED).
- Every tenant-owned record carries `organizationId` — `students`, `teachers`,
  `classes`, `subjects`, `enrollments`, `academicRecords`, `attendance`,
  `reports`, `requests`, `sessions`, `documents`, `announcements`, `credentials`,
  `faculties`, `departments`, `programs`, `courses`.
- Every `User` (except platform admin) has `organizationId`. Institution staff
  additionally have an `organizationRole` (`admin`, `teacher`, `student`, …).

## How isolation is enforced (server-side only)

`server/lib/tenant.ts`:

```
tenantScope(user)
  admin       → { all: true }
  government  → { government: { level, provinces[], districts[] } }   (policy-scoped)
  everyone else → { organizationId: user.organizationId }

scopeRows(user, rows)      filter a list to the caller's scope
assertTenant(user, record) throw TenantError (403) unless the record is in scope
```

Every service `list` runs `scopeRows`; every `get`/`update`/`remove` loads the
record then `assertTenant` **before** returning or mutating it. Route params are
never trusted — `GET /api/students/:id` fetches the row, checks the tenant, and
only then responds.

```
School A (ORG-…001) → GET /api/students/<a School B id>  →  403 TENANT_FORBIDDEN
```

The browser has **no** enforcement role. `hasPermission` in `AuthContext` only
hides nav/buttons for UX; the API rejects the call regardless.

## Government scoping (spec §37)

`User.govScope = { level: NATIONAL | REGIONAL | DISTRICT, provinces?, districts? }`.
`inScope()` resolves an institution's `province`/`district` against the officer's
policy. Analytics for government are **aggregated only** — per-institution and
per-district counts and rates, never individual student rows (spec §38).

## Cross-tenant operations

The only sanctioned cross-tenant flow is a **student transfer**
(`server/services/transferService.ts`): School A initiates → an authorized party
approves → School B accepts → the student's active enrolment is closed
(`TRANSFERRED`), a new enrolment opens at School B, and the student + user
`organizationId` move. All prior enrolment / academic / report history stays
readable to whoever still has tenant access to it.

## Tests

`server/test/platform.test.ts` proves: School A sees only ORG-001 students; a
guessed School B id → 403; School A cannot read a School B report or list users;
A and B student sets are disjoint; a student reads only their own records; the
university tenant is independent; admin sees across all tenants.
