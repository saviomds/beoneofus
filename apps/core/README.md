# BeOneOfUs — Multi-Tenant Education & Institutional Ecosystem

A **client + server** platform where many isolated institutions (schools,
universities, colleges) each operate their own portal, connected to a government
oversight layer and a platform admin control centre.

- **Client** — Vite + React + TypeScript SPA (`src/`)
- **Server** — Node + Express + a hardened JSON file store (`server/`), owner of
  all data, tenant isolation, auth, backups and crash recovery
- **Shared** — types, RBAC and education config used by both (`shared/`)

The storage engine is deliberately behind a `Repository<T>` interface so it can
be swapped for Postgres/Supabase without touching services, routes or the UI —
see [MIGRATION.md](./MIGRATION.md).

## Quick start

```bash
npm install
npm run dev        # Vite (5173) + API (3001), proxied
# open http://localhost:5173

npm run typecheck  # client + server
npm run lint
npm test           # 49 server tests: isolation, integrity, concurrency, onboarding, backup, inter-institution, academics, operations
npm run build      # tsc (x2) + vite build
npm start          # production: single Node process serving API + built client on :3001
```

First run seeds `/data` from `server/data/seed`. Restarting **never** re-seeds or
wipes data — it runs recovery. `npm run seed` regenerates the seed files.

## Demo accounts — password `demo123`

| Code | Role | Tenant |
|---|---|---|
| `BOU-STU-10231` | Student (Aline Uwase) | ORG-RW-SCH-000001 — Kigali Innovation Academy |
| `BOU-TEA-40871` | Teacher / Mentor | ORG-RW-SCH-000001 |
| `BOU-SCH-77120` | Institution admin (School A) | ORG-RW-SCH-000001 |
| `BOU-SCH-77121` | Institution admin (School B) | ORG-RW-SCH-000002 — Green Hills Academy |
| `BOU-ORG-UNI-00001` | Institution admin (University) | ORG-RW-UNI-000001 — Kigali Institute of Technology |
| `BOU-GDN-00001` | Parent / Guardian (Josephine Uwase) | platform-level; linked to children at School A **and** School B |
| `BOU-GOV-00042` | Government (MINEDUC) | platform-level, national scope |
| `BOU-ADM-00001` | Platform administrator | platform-level |

> **Government codes rotate.** `BOU-GOV-00042` works once; after sign-in your next
> code is shown on the dashboard and in Settings → Security.
>
> **School A can never see School B or the University**, and vice-versa — enforced
> in the server, not the browser. Try changing an id in a URL: the API returns 403.

Full walkthrough incl. the invitation-onboarding demo: [DEMO-ACCOUNTS.md](./DEMO-ACCOUNTS.md).

## Documentation

| File | Contents |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, folders, request lifecycle, event chains |
| [MULTI-TENANCY.md](./MULTI-TENANCY.md) | The tenant model and how isolation is enforced |
| [DATABASE.md](./DATABASE.md) | Collections, relationships, the file store |
| [SECURITY.md](./SECURITY.md) | Threat model and controls |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Sessions, cookies, scrypt, lockout, code rotation |
| [RBAC.md](./RBAC.md) | Roles, permissions, the matrix |
| [BACKUP-RECOVERY.md](./BACKUP-RECOVERY.md) · [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) | Snapshots, journal, startup recovery |
| [INSTITUTION-ONBOARDING.md](./INSTITUTION-ONBOARDING.md) | Invitations → registration → approval |
| [STUDENT-LIFECYCLE.md](./STUDENT-LIFECYCLE.md) | Enrolment, promotion, graduation, transfer |
| [INTER-INSTITUTION.md](./INTER-INSTITUTION.md) | Record requests, consent, share-grants, credential verification, gov campaigns |
| [ACADEMICS.md](./ACADEMICS.md) | Weighted assessments, report cards, transcripts, period attendance, excuses, interventions |
| [GUARDIAN-PORTAL.md](./GUARDIAN-PORTAL.md) | The guardian role, cross-institution links, read-only portal |
| [OPERATIONS.md](./OPERATIONS.md) | Timetable, admissions, finance, CSV bulk import, year-end batch, PDF export |
| [API.md](./API.md) | REST endpoint reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Hosting, env vars, the `/data` volume |
| [TESTING.md](./TESTING.md) | What the test suite covers |
| [MIGRATION.md](./MIGRATION.md) | JSON file store → Postgres/Supabase |

## What is and isn't real

Genuinely functional: multi-tenant isolation, RBAC, enrolment/transfer,
invitations, reports, government requests, notifications, audit, analytics,
optimistic-concurrency, atomic writes, journal, snapshot backups and startup
recovery. Also: **inter-institution record requests with a consent ledger and
scoped, revocable, time-limited share-grants; record-carrying transfers; public
credential verification; configurable government data campaigns**
([INTER-INSTITUTION.md](./INTER-INSTITUTION.md)); **weighted assessments →
computed, position-ranked, published report cards → cumulative cross-institution
transcripts; period attendance with an excuse workflow and automatic
below-threshold interventions** ([ACADEMICS.md](./ACADEMICS.md)); and a
**read-only guardian portal** for parents linked to children across institutions
([GUARDIAN-PORTAL.md](./GUARDIAN-PORTAL.md)); and **timetabling, an admissions
pipeline that converts to enrolment without duplicate identities, fee
structures / invoices / manually-recorded payments, CSV bulk import, year-end
promotion & graduation batches, and server-rendered report-card & transcript
PDFs** ([OPERATIONS.md](./OPERATIONS.md)).

**Not real** (labelled in-UI): payment gateways (payments are recorded by hand),
video calls, email/SMS delivery, external government APIs, SSO, and file
*contents* — document "uploads" record metadata only.
