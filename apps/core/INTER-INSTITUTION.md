# Inter-Institution Connectivity

How institutions on BeOneOfUs share student data with each other **without ever
merging tenants or copying records blindly**. Four connected subsystems:

1. **Record requests** — a formal ask for another institution's records
2. **Consent** — an immutable ledger of who authorised a release
3. **Record-share grants** — the scoped, revocable, time-limited read access that
   an approval (or a transfer) produces
4. **Credential verification** — public confirmation that a credential is genuine

Plus **government data campaigns** (§5), the ministry↔institutions channel.

---

## 1. The grant is the only cross-tenant key

A student's records always keep the `organizationId` of the institution that
created them. Nothing is ever copied to another tenant. Instead, a
`RecordShareGrant` (`data/recordGrants.json`) records that institution *R* may
read specified `RecordType`s for one student, held by institution *S*:

```
RecordShareGrant {
  studentId, sourceOrganizationId (S), recipientOrganizationId (R),
  recordTypes: RecordType[],          // IDENTITY, ENROLLMENTS, ACADEMIC_RECORDS,
                                      // ATTENDANCE_SUMMARY, REPORTS, CREDENTIALS,
                                      // TRANSFER_HISTORY
  reason: STUDENT_TRANSFER | RECORDS_REQUEST,
  requestId?, transferId?, consentId?,
  grantedBy, grantedAt, expiresAt?, revokedAt?, revokedBy?,
  status: ACTIVE | EXPIRED | REVOKED
}
```

The read gate lives in `server/lib/records.ts`:

```
assertRecordAccess(actor, student, recordType):
  admin                                   -> allow
  actor.organizationId == student.org     -> allow (own tenant)
  active grant covers (student, type)      -> allow (cross-institution, read-only)
  otherwise                                -> throw TenantError (403)
```

`studentService` / `enrollmentService` call the ordinary tenant check first and
fall through to `assertRecordAccess` only on a `TenantError`. Grants are swept to
`EXPIRED` lazily on read, so an elapsed `expiresAt` denies access on the very
next request.

There is **no endpoint that returns "everything shared with me"** as a roster —
cross-tenant reads are always for one identified student, through the normal
`GET /students/:id/{academic,attendance,reports,credentials,enrollments}` routes.

---

## 2. Record request lifecycle

`data/recordRequests.json` · `server/services/recordRequestService.ts`

```
        requesting institution (R)                 holding institution (S)
        --------------------------                 -----------------------
POST /record-requests  ─────────────▶  SUBMITTED
  {studentId, sourceOrganizationId,        │   (R must have the student now or in
   requestedRecordTypes[], purpose,        │    its enrolment history, or 404)
   legalBasis}                             │
                                           ▼
                              GET /record-requests  (incoming queue for S)
                                           │
                    POST /record-requests/:id/review {decision}
                       reject      ──▶ REJECTED
                       need_info   ──▶ MORE_INFORMATION_REQUIRED
                       approve /partial:
                         requires a lawful basis:
                           • a GRANTED Consent for (student, R), or
                           • an explicit legalBasis string
                         creates RecordShareGrant (expiresInDays, default 90)
                                 ──▶ APPROVED | PARTIALLY_APPROVED  + grantId
                                           │
        R can now read the approved        │
        categories for that student        │
                                           ▼
                    POST /record-requests/:id/revoke   ──▶ REVOKED
                       (also flips the grant to REVOKED)
```

Statuses: `DRAFT SUBMITTED UNDER_REVIEW MORE_INFORMATION_REQUIRED APPROVED
PARTIALLY_APPROVED REJECTED EXPIRED REVOKED FULFILLED`.

Every transition writes an audit event (`RECORD_REQUEST_*`) and a timeline entry,
and notifies the other institution's admins.

**Isolation:** only the two named institutions (and admin/government) can `GET` a
request. Only *S* can review it — `authorize(actor, 'APPROVE_RECORD_REQUEST', …)`
checks `actor.organizationId === sourceOrganizationId`. *R* reviewing its own
request → 403.

---

## 3. Consent ledger

`data/consents.json` · `server/services/consentService.ts`

A `Consent` is **append-only**: its `history: ConsentEvent[]` only grows, and
consents are never deleted. Withdrawing sets `status = WITHDRAWN`, appends an
event, and **revokes every grant that cited that consent** (`revokeGrantsBy`).

```
Consent {
  studentId, requestingOrganizationId, sourceOrganizationId,
  grantedByName, grantedByRelationship (self|parent|guardian|legal_representative|other),
  scopeRecordTypes[], purpose, legalBasis, termsVersion,
  status: REQUESTED|GRANTED|REJECTED|WITHDRAWN|EXPIRED|REVOKED,
  requestId?, decidedAt?, expiresAt?, history[]
}
```

Today the holding institution records the consent it has on file (a registrar
attests name + relationship + scope). When the guardian portal lands (Tranche B)
a guardian will be able to grant/withdraw directly against the same ledger.

Only the holding institution may record or withdraw a consent
(`authorize(actor, 'MANAGE_CONSENT', {sourceOrganizationId})`).

---

## 4. Transfers carry records

When `POST /transfers/:id/accept` completes (see
[STUDENT-LIFECYCLE.md](./STUDENT-LIFECYCLE.md)):

- the active enrolment is closed `TRANSFERRED`, a new `ACTIVE` enrolment opens at
  the destination, all history is retained;
- a `RecordShareGrant` with `reason: STUDENT_TRANSFER`, **all** record types and
  **no expiry** is created for the receiving institution;
- audit `RECORD_GRANT_CREATED`; both institutions are notified.

The origin keeps the raw records (unchanged `organizationId`); the destination
reads them through the grant and through owning the student going forward.

---

## 5. Credential verification (public)

`data/credentials.json` · `server/services/credentialService.ts` ·
client page `/verify/:code`

- `POST /credentials {studentId, title, type, issuedDate?}` — the institution
  issues a certificate/diploma/badge/award; a unique `BOU-CRD-XXXX-XXXX`
  verification code is generated; the student is notified.
- `POST /credentials/:id/revoke {reason}` — sets `status = revoked`.
- `GET /verify/:code` — **no authentication**, IP-rate-limited. Returns only:
  `valid, status, credentialTitle, credentialType, holderName, issuerName,
  issuedDate, verificationCode`. Never grades, contact details, documents,
  guardians, date of birth or the student id. Unknown code → `{ valid: false }`;
  revoked → `{ valid: false, status: "revoked" }`.

The holder's name is included because a credential check is worthless without it;
it is the *only* piece of personal data on the page and it is already printed on
the physical certificate.

---

## 6. Government data campaigns

`data/campaigns.json` + `data/campaignSubmissions.json` ·
`server/services/campaignService.ts`

```
government                                      institutions
----------                                      ------------
POST /campaigns {title, fields[], dueAt,          (fields: text|number|integer|
  audienceOrganizationTypes[]}  ─▶ DRAFT           boolean|select|date, required)
PATCH /campaigns/:id            (draft only)
POST /campaigns/:id/publish  ─▶ OPEN
   → resolves the audience to every ACTIVE org of those types
   → creates a NOT_STARTED CampaignSubmission per institution
   → notifies each institution
                                                 GET /campaigns   (their queue)
                                                 GET /campaigns/:id/submission
                                                 PUT …/submission {data}  ─▶ IN_PROGRESS
                                                 POST …/submit   (required fields
                                                   enforced)      ─▶ SUBMITTED
GET /campaigns/:id/dashboard
   → {assigned, completionPct, overdue,
      totals by status}
GET /campaigns/:id/submissions
POST /campaign-submissions/:id/review
   {decision: approve|return, note}
      approve ─▶ APPROVED
      return  ─▶ RETURNED  (institution can edit & resubmit)
POST /campaigns/:id/close  ─▶ CLOSED
```

Campaign status is partly derived: past `dueAt` → `CLOSED`, within 3 days →
`CLOSING_SOON`. Institutions only ever see published campaigns that target them;
the dashboard/submissions/review endpoints require `campaign.manage`
(government/admin).

---

## Data model summary

| Collection | Owner | Notes |
|---|---|---|
| `recordRequests` | both parties | workflow + timeline, `grantId` when approved |
| `recordGrants` | source | the cross-tenant read key; swept to `EXPIRED` on read |
| `consents` | source | append-only `history`; withdrawal revokes reliant grants |
| `campaigns` | government | configurable `fields[]`, resolved `targetOrganizationIds[]` |
| `campaignSubmissions` | institution | one per targeted institution per campaign |

## Tests

`server/test/network.test.ts` — public verification + no-PII-leak, issue/revoke
reflected publicly, cross-school credential issue blocked, request stays private
until approved then readable then revocable, self-review blocked, consent
withdrawal voids access, expired grant denies, transfer creates a grant, campaign
publish→submit→dashboard→approve, campaign audience isolation + required-field
enforcement.
