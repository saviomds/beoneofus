# Roles & Permissions

`shared/rbac.ts` — shared by client and server.

## Principle

Permissions are the unit of authorization; roles are named bundles. Code checks
`hasPermission(user, 'students.view')`, never `user.role === 'school'`. A user
may carry extra `permissions[]` granted by an admin, unioned with the role
defaults. `admin` passes every check.

**Authorization has two independent gates, both enforced server-side:**
1. `assertPermission(user, perm)` — may this user perform this *action*?
2. `assertTenant(user, record)` — does this *record* belong to a tenant the user
   may see? (see [MULTI-TENANCY.md](./MULTI-TENANCY.md))

A third, **cross-institution** gate applies to shared student records: even with
the permission and a valid request, another institution may read a student's
records only while an **active `RecordShareGrant`** covers the record type
(`server/lib/records.ts`, `assertRecordAccess`). See
[INTER-INSTITUTION.md](./INTER-INSTITUTION.md).

`shared/policy.ts` centralises the action→permission→tenant mapping as
`can(actor, action, resource)`; `server/lib/authorize.ts` is the throwing wrapper
that also writes a `POLICY_DENIED` audit event.

## Roles

`student · teacher · mentor · guardian · school` (the institution-admin account)
`· government · admin`. Institution-internal `organizationRole`
(`owner/admin/principal/registrar/teacher/mentor/counselor/student`) is stored on
the user for future per-staff permissioning.

`guardian` (code prefix `BOU-GDN-`) is platform-level (no `organizationId`) and
read-only. It holds no `students.view`; its access to a child comes entirely from
an active `GuardianLink` resolved in the record gate — see
[GUARDIAN-PORTAL.md](./GUARDIAN-PORTAL.md).

## Permission matrix (abridged — see `ROLE_PERMISSIONS` for the full list)

| Permission | student | teacher | mentor | school | government | admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `students.view` | | ● | ● | ● | | ● |
| `students.view.own` | ● | | | | | ● |
| `students.create/edit/archive/assign` | | | | ● | | ● |
| `enrollment.manage` | | | | ● | | ● |
| `transfer.initiate / .accept` | | | | ● | | ● |
| `transfer.approve` | | | | | ● | ● |
| `records.request` · `records.share` · `consent.manage` | | | | ● | | ● |
| `credentials.issue` · `credentials.revoke` | | | | ● | | ● |
| `campaign.respond` | | | | ● | | ● |
| `campaign.manage` · `campaign.review` | | | | | ● | ● |
| `assessment.manage` | | ● | | ● | | ● |
| `assessment.scheme.manage` · `reportcard.manage/.publish` | | | | ● | | ● |
| `attendance.excuse` · `intervention.manage` | | ● (excuse) | | ● | | ● |
| `guardian.link.manage` | | | | ● | | ● |
| `guardian.portal` | | | | | | ● + guardian |
| `timetable.manage` · `admissions.view/.manage` | | | | ● | | ● |
| `finance.view` · `finance.manage` | | | | ● | | ● |
| `finance.view.own` | ● | | | | | ● + guardian |
| `data.import` · `operations.batch` | | | | ● | | ● |
| `attendance.record` · `academic.record` | | ● | | ● | | ● |
| `classes.manage` · `university.manage` | | ● (classes) | | ● | | ● |
| `reports.create/edit` | | ● | ● | ● | | ● |
| `reports.approve` | | | | ● | ● | ● |
| `government.requests.create` | ● | | | ● | | ● |
| `government.requests.process` | | | | | ● | ● |
| `institution.view / .edit` | ● (view) | ● (view) | | ● | ● (view) | ● |
| `org.approve` · `invitation.create/revoke` | | | | | ● | ● |
| `org.create` | | | | | | ● |
| `analytics.school / .government / .platform` | | | | school | gov | all |
| `users.manage` · `system.settings` | | | | | | ● |
| `system.health` · `backup.manage` | | | | | | ● |
| `audit.view` (all) / `audit.view.org` (scoped) | | | | org | org | all |
| `support.impersonate` | | | | | | ● |

The admin **System Health** page renders the live matrix per role.

## Adding a permission

1. Add to `PERMISSIONS` in `shared/rbac.ts`.
2. Add to the relevant role arrays in `ROLE_PERMISSIONS`.
3. Enforce with `assertPermission()` in the service and/or `requirePermission()`
   on the route; gate the UI with `hasPermission`.
