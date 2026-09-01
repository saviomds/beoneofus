# Academic Depth — Assessments, Report Cards, Transcripts, Attendance

Tranche B. Sits alongside the original lightweight `academicRecords` (one grade
per subject/term, still used for the transfer/record-sharing payload) — this adds
the **weighted, computed, published** layer.

## 1. Grading schemes (configurable, never hard-coded)

`data/assessmentSchemes.json` · `server/services/academicService.ts`

```
AssessmentScheme {
  organizationId, name, level: EducationStructureKey, isDefault,
  components: { key, label, weight }[]   // weights MUST sum to 100
  gradeBands: { min, letter, gpa, label }[]
  passMark
}
```

An institution defines one scheme per education level (e.g. A-Level: CA 30% /
Mid-term 30% / Final 40%). `POST /academic/schemes` validates the weights total
100 and keys are unique. `schemeFor(org, level)` resolves the default.

## 2. Assessments (the weighted components)

`data/assessments.json`

```
Assessment { studentId, subjectId, classId, academicYear, term,
             componentKey, title, score, maxScore, teacherId }
```

Teachers enter marks in the **Gradebook** (`/teacher/gradebook`): pick class →
subject → component → enter a mark per student → `POST /assessments/bulk`.
`ASSESSMENT_MANAGE` permission (teacher + school). Each mark notifies the student.

## 3. Report cards (computed + ranked + published)

`data/reportCards.json`

`POST /report-cards/generate { classId, term, academicYear }` (school) computes a
draft `ReportCard` per student in the class:

- **per subject**: `componentPercent` = mean of `score/maxScore` for that
  component; `weightedScore` = Σ(componentPercent × weight) ÷ Σ(weight of
  components that have marks); `letter`/`gpa` from the scheme's bands.
- **subject position**: rank within the class on that subject's weighted score.
- **overall**: `average` and `gpa` across graded subjects; `overallPosition` =
  rank within the class on the mean weighted score; `classSize`.
- **attendanceRate** folded in from `data/attendance.json`.

Regenerating updates drafts in place; **published cards are never overwritten**.
`PATCH /report-cards/:id` adds conduct + head-teacher remark (draft only).
`POST /report-cards/:id/publish` (`REPORTCARD_PUBLISH`) freezes it and notifies
the student **and every active guardian**.

Visibility: students and guardians see only **published** cards for their own
student (`GET /students/:id/report-cards`); staff see drafts for their tenant.

## 4. Transcript

`GET /students/:id/transcript` — a cumulative record:

- every **published** report card, oldest first, with per-subject scores/grades,
  term GPA/average/position, and **which institution** the term was at;
- legacy `academicRecords` folded in for terms without a report card;
- `cumulativeGpa` across all terms.

Cross-institution: the transcript passes through the same record gate as other
student data (own tenant · guardian link · active `RecordShareGrant` · former
institution) — so a receiving school (post-transfer) or a university (via an
approved records request) can pull a student's full history.

## 5. Period-level attendance + excuse workflow

`AttendanceRecord` gained `period` (0 = whole day, 1..n = timetabled period),
`subjectId`, and an excuse block (`excuseStatus`, `excuseReason`, `excusedBy`,
`excusedAt`). `POST /classes/:id/attendance` accepts `period` and `subjectId`;
records are keyed on `(student, date, period, subject)`.

```
absence recorded
     │
student OR linked guardian: POST /attendance/:id/excuse { reason }   → excuseStatus = requested
     │
teacher/school: GET /attendance/excuses/pending
                POST /attendance/:id/excuse/review { decision }
                   approve → status = "excused", excuseStatus = approved
                   reject  → excuseStatus = rejected
```

Both the student and guardians are notified of the outcome.

## 6. Automatic interventions

`data/interventions.json` · `server/services/interventionService.ts`

After any absence is recorded (or an excuse approved),
`evaluateAttendanceThreshold` recomputes the student's attendance rate
(present + late + excused ÷ total). If it is **below the institution's configured
`attendanceThreshold`** (Settings → school, default 75%) and no attendance
intervention is already open, one is auto-opened (`autoOpened: true`), and staff +
guardians are alerted.

Staff work cases at `/school/interventions`: filter by status, assign to a
teacher, add dated case notes, move through `open → in_progress → resolved /
escalated`. Academic and conduct interventions are opened manually.

## Permissions

`assessment.manage` · `assessment.scheme.manage` · `reportcard.manage` ·
`reportcard.publish` · `attendance.excuse` · `intervention.manage` — all on
`school`; teachers also hold `assessment.manage` and `attendance.excuse`.

## Tests

`server/test/academics.test.ts` — weight math (CA 90·.3 + Mid 84·.3 + Fin
88·.4 = 87.4 → A), position ranking, draft-not-visible / published-visible to
student + guardian, transcript aggregation, weight-sum validation, auto
attendance intervention, full excuse workflow, guardian-initiated excuse.
