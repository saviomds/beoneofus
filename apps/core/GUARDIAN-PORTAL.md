# Guardian Portal

A new platform role — `guardian` (code prefix `BOU-GDN-`) — for parents and
guardians. A guardian may be linked to **multiple children at different
institutions** and gets a **read-only** view that never bypasses a school's
permissions.

## Links

`data/guardianLinks.json` · `server/services/guardianService.ts`

```
GuardianLink {
  guardianUserId, studentId,
  organizationId,                 // the child's institution when linked (informational)
  relationship: mother|father|guardian|other,
  status: pending|active|revoked,
  canViewRecordTypes: RecordType[],   // subset of IDENTITY, ACADEMIC_RECORDS,
                                      //   ATTENDANCE_SUMMARY, REPORTS
  isPrimary, addedBy, verifiedAt
}
```

The **institution** creates links (`GUARDIAN_LINK_MANAGE`, on `school`) at
`/school/guardians`:

- `POST /guardians/links` — link an existing guardian by code, or create a new
  guardian account on the spot (school-verified, `status: active`, temp password
  `demo123`, the new `BOU-GDN-…` code is returned once).
- `PATCH /guardians/links/:id` — change the viewable record types / relationship.
- `POST /guardians/links/:id/revoke` — `status: revoked`; the guardian is notified
  and loses access immediately.

A guardian linked to children at School A **and** School B sees both from one
account — the link, not the tenant, is the authorization.

## How access is enforced

Guardian reads go through the **same record gate** as every other cross-party
read (`server/lib/records.ts`, `assertRecordAccess`):

```
actor.role === 'guardian':
  active GuardianLink(guardian, student) exists
    AND link.canViewRecordTypes includes the requested RecordType
      -> allow (read-only)
  else -> 403
```

So `GET /students/:id/{academic,attendance,report-cards,transcript}` work for a
linked guardian and 403 for any other student. Guardians never get
`students.view`, cannot list a school's students, and cannot reach
`/interventions`, `/guardians/links`, `/report-cards` (staff view), `/students`
(create), `/academic/schemes`, etc.

## The portal (`/guardian`)

- **Overview** — one card per child: institution, grade, attendance %, latest GPA.
- **My Children** → per child: **Grades** (assessment marks), **Attendance**
  (with a *Request excuse* action on unexcused absences →
  `POST /guardian/attendance/:id/excuse`), **Report cards** (published only, full
  breakdown), **Announcements** (the child's institution, audience `all` /
  `student` / `guardian`).

## Notifications a guardian receives

Report card published · attendance concern / auto-intervention opened · excuse
request outcome · linked / unlinked.

## Demo

`BOU-GDN-00001` (Josephine Uwase) — linked to **Aline Uwase** (STD-A-001, School
A) and **Kevin Rugamba** (STD-B-001, School B). Password `demo123`. Shows the
cross-institution case out of the box on a fresh `/data`.

## Tests

`server/test/academics.test.ts` — guardian signs in and sees exactly two
children from two orgs; reads a linked child but 403 on an unrelated student;
cannot reach institution-only endpoints; sees a published report card and can
request an excuse for a linked child.
