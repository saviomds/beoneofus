# Demo Accounts & Walkthrough

Password for all accounts: **`demo123`**

| Code | Role | Tenant |
|---|---|---|
| `BOU-STU-10231` | student — Aline Uwase | ORG-RW-SCH-000001 (School A, Kigali Innovation Academy) |
| `BOU-TEA-40871` | teacher + mentor — Dominique Savio M. | ORG-RW-SCH-000001 |
| `BOU-SCH-77120` | institution admin — School A | ORG-RW-SCH-000001 |
| `BOU-SCH-77121` | institution admin — School B (Green Hills Academy) | ORG-RW-SCH-000002 |
| `BOU-ORG-UNI-00001` | institution admin — University (Kigali Institute of Technology) | ORG-RW-UNI-000001 |
| `BOU-GDN-00001` | parent / guardian — Josephine Uwase | platform-level; linked to Aline (School A) **and** Kevin (School B) |
| `BOU-GOV-00042` | government (MINEDUC, national) | platform-level ¹ |
| `BOU-ADM-00001` | platform administrator | platform-level |

¹ **The government code rotates on every sign-in.** `BOU-GOV-00042` works the
first time; afterwards the next code is shown on the government dashboard and in
Settings → Security. Lost it? `Admin → Users` shows current codes, or wipe `/data`
in dev.

Supporting seed people (login works): Eric `BOU-STU-RW-2026-000012`, Grace
(inactive), Mireille, plus School B's Kevin/Sandrine/Patrick and the University's
Yves/Chantal and two lecturers.

## Prove the isolation first

1. Sign in as **`BOU-SCH-77120`** (School A). Note the students, teachers, reports.
2. Open devtools → console →
   `fetch('/api/students/STD-B-001').then(r=>console.log(r.status))` → **403**.
3. Sign out, sign in as **`BOU-SCH-77121`** (School B) → a completely different,
   non-overlapping data set.
4. Sign in as **`BOU-ORG-UNI-00001`** → the university portal: Faculties &
   Programs, university enrolments, no school-only nav.

## End-to-end script

### 1. Admin issues an institution invitation
Sign in as `BOU-ADM-00001` → **Invitations** → *New invitation* (e.g. "Nyamata
College of Science", COLLEGE). Copy the one-time link.
(Or use the seeded pending link: `/register/institution?token=demo-pending-invite-token-0001`.)

### 2. Representative registers
Open the link in a private window → fill the form, choose a password → submit.
The institution is created **PENDING** and you get an institution-admin code.
Reload the link → it is now `ACCEPTED` and refuses reuse.

### 3. Admin approves
Back as `BOU-ADM-00001` → **Institutions** → the new org → **Approve**. Its admin
code can now sign in.

### 4. Institution operates (School A)
Sign in as `BOU-SCH-77120`:
- **Students** → *Add student* (real `User` + `Student` + initial enrolment), or
  *Assign* class/teacher/mentor.
- **Transfers** → *Initiate transfer* of a student to another institution.
- **Reports** → review the teacher's submitted report → **Approve**.
- **Government** → *New request* to MINEDUC.

### 5. Teacher / mentor
Sign in as `BOU-TEA-40871`:
- **Attendance** → pick a class, mark a student absent, **Save** (reload to confirm it persisted).
- **Reports** → *New report* about Aline, tick *submit for review*.
- **Mentorship** → open the scheduled session, edit the **private note** (students never see it), **Save**.

### 6. Government
Sign in as `BOU-GOV-00042` (note the rotated code for next time):
- **Request Center** → the School A request → **Receive** → **Assign** → **Open** →
  set *Approved* + an official response → **Update**. School A is notified; the
  timeline records every step.
- **Analytics** / **Institutions** → aggregated stats only, no student names.
- **Authorize Institutions** → issue invitations within jurisdiction.

### 7. Admin oversight
`BOU-ADM-00001`:
- **System Health** → storage status, integrity, journal, sessions, live role matrix.
- **Backups** → *Create backup*, then *Restore* one (typed `RESTORE` confirm) — a
  `pre-restore` safety backup appears automatically.
- **Audit Logs** → every action above, filterable.
- **Users** → *Support view* opens a user's portal (amber banner + Exit, audited).

### 8. The loop closed
Back as `BOU-STU-10231` → **Reports** shows the approved report + a notification.
Back as `BOU-SCH-77120` → **Government** shows the request *Approved* with the
response and full timeline.

### 9. Academics → report card → guardian
- `BOU-TEA-40871` → **Gradebook** → class *S5 Software Engineering*, a subject,
  a component (CA / Mid-term / Final), enter marks, **Save**.
- `BOU-SCH-77120` → **Grading Schemes** (see the seeded A-Level 30/30/40 scheme) →
  **Report Cards** → pick the class + term → **Generate** → open a card (weighted
  score, GPA, class position, attendance) → **Publish**.
- `BOU-STU-10231` → **Report Cards** → the published card + the **Transcript** tab.
- `BOU-GDN-00001` → **My Children** → *Aline* (School A) and *Kevin* (School B)
  from one login; open Aline → Grades / Attendance / Report cards; on an unexcused
  absence use **Request excuse** → `BOU-SCH-77120` → **Attendance** approves it.
- Mark a student absent repeatedly → `BOU-SCH-77120` → **Interventions** shows the
  auto-opened attendance case.

### 10. Operations (School A)
`BOU-SCH-77120`:
- **Timetable** → class *S5 Software Engineering* → add day/period slots.
- **Admissions** → the seeded *Divine Ishimwe* application → Start review → Make
  offer → Accept → **Enrol** (creates the student once).
- **Finance** → the seeded *A-Level day — 2026* fee structure → *New invoice* for
  a student → **Record payment** (a receipt number is generated).
  `BOU-STU-10231` → **Fees & Invoices** sees the seeded partially-paid invoice.
- **Bulk Import** → *Load template* (students) → **Validate** → **Commit valid rows**.
- **Year-End** → pick a class → *Preview promotion* → **Commit** (audited).
- Any published report card → **Download PDF**; **Report Cards & Transcript** →
  Transcript tab → **Download PDF**.

> **New demo data (guardian, grading schemes, timetable, admissions, finance)
> only appears on a fresh `/data`.** Restart never re-seeds — `rm -rf data` then
> `npm run dev` to pick them up.

## Reset

Dev: stop the server, `rm -rf data`, restart (re-seeds). Prod: Admin → Backups →
Restore a known-good snapshot.
