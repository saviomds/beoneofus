// Tranche B — weighted assessments & report cards, period attendance + excuse
// workflow + auto-intervention, guardian portal (cross-institution), and the
// former-institution read path.

import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
const DATA_DIR = mkdtempSync(join(tmpdir(), 'bou-acad-'))
process.env.BOU_DATA_DIR = DATA_DIR

let server: Server
let base: string
let cookie = ''

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const sc = res.headers.get('set-cookie')
  if (sc) cookie = sc.split(';')[0]
  let json: { data?: unknown; error?: { code: string; message: string } } = {}
  try {
    json = (await res.json()) as typeof json
  } catch {
    /* no body */
  }
  return { status: res.status, body: json }
}
const d = <T>(r: { body: { data?: unknown } }) => r.body.data as T
const login = async (code: string, password = 'demo123') => {
  cookie = ''
  return call('POST', '/auth/login', { code, password })
}

const TERM = 'Term 2 2026'

before(async () => {
  const { bootStorage } = await import('../lib/db.ts')
  bootStorage()
  const { createApp } = await import('../app.ts')
  server = createApp().listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://localhost:${(server.address() as AddressInfo).port}/api`
})

after(() => {
  server?.close()
  try {
    rmSync(DATA_DIR, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
})

// ------------------------------------------------------------ guardian role ---

test('the seeded guardian can sign in and sees children across two institutions', async () => {
  const r = await login('BOU-GDN-00001')
  assert.equal(r.status, 200)
  assert.equal(d<{ user: { role: string } }>(r).user.role, 'guardian')

  const children = d<{ student: { id: string }; organizationName: string }[]>(await call('GET', '/guardian/children'))
  assert.equal(children.length, 2)
  const ids = children.map((c) => c.student.id).sort()
  assert.deepEqual(ids, ['STD-A-001', 'STD-B-001'])
})

test('a guardian can read a linked child but not an unrelated student', async () => {
  await login('BOU-GDN-00001')
  assert.equal((await call('GET', '/guardian/children/STD-A-001')).status, 200)
  assert.equal((await call('GET', '/students/STD-A-001/attendance')).status, 200)
  // STD-A-002 (Eric) is not linked to this guardian
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)
  assert.equal((await call('GET', '/guardian/children/STD-A-002')).status, 404)
})

test('a guardian cannot reach institution-only endpoints', async () => {
  await login('BOU-GDN-00001')
  assert.equal((await call('GET', '/interventions')).status, 403)
  assert.equal((await call('GET', '/guardians/links')).status, 403)
  assert.equal((await call('POST', '/students', { firstName: 'x', lastName: 'y', gradeLevel: 'S1', level: 'O_LEVEL' })).status, 403)
  assert.equal((await call('POST', '/academic/schemes', { name: 'x', level: 'O_LEVEL', components: [] })).status, 403)
})

// ------------------------------------------ weighted assessments & report card ---

test('a weighted report card computes the configured component weighting and ranks position', async () => {
  await login('BOU-SCH-77120')
  const gen = d<{ created: number; updated: number }>(await call('POST', '/report-cards/generate', {
    classId: 'CLS-A-001', term: TERM, academicYear: '2026',
  }))
  assert.ok(gen.created + gen.updated >= 1)

  const cards = d<{ studentId: string; average: number; gpa: number; overallPosition: number | null; lines: { subjectName: string; weightedScore: number | null; letter: string }[] }[]>(
    await call('GET', `/report-cards?classId=CLS-A-001&term=${encodeURIComponent(TERM)}`),
  )
  const aline = cards.find((c) => c.studentId === 'STD-A-001')!
  const web = aline.lines.find((l) => l.subjectName.includes('Web'))!
  // CA 90*.30 + Midterm 84*.30 + Final 88*.40 = 87.4
  assert.equal(web.weightedScore, 87.4)
  assert.equal(web.letter, 'A')
  assert.equal(aline.overallPosition, 1)
})

test('a published report card is visible to the student and their guardian; drafts are not', async () => {
  await login('BOU-SCH-77120')
  const cards = d<{ id: string; status: string; studentId: string }[]>(await call('GET', `/report-cards?classId=CLS-A-001&term=${encodeURIComponent(TERM)}`))
  const aline = cards.find((c) => c.studentId === 'STD-A-001')!

  // student cannot see it while draft
  await login('BOU-STU-10231')
  assert.equal(d<unknown[]>(await call('GET', '/students/STD-A-001/report-cards')).length, 0)

  await login('BOU-SCH-77120')
  const published = d<{ status: string }>(await call('POST', `/report-cards/${aline.id}/publish`))
  assert.equal(published.status, 'published')

  await login('BOU-STU-10231')
  assert.equal(d<unknown[]>(await call('GET', '/students/STD-A-001/report-cards')).length, 1)

  await login('BOU-GDN-00001')
  const overview = d<{ reportCards: unknown[] }>(await call('GET', '/guardian/children/STD-A-001'))
  assert.equal(overview.reportCards.length, 1)

  // transcript reflects the published card
  await login('BOU-STU-10231')
  const t = d<{ terms: unknown[]; cumulativeGpa: number }>(await call('GET', '/students/STD-A-001/transcript'))
  assert.ok(t.terms.length >= 1)
  assert.ok(t.cumulativeGpa > 0)
})

test('component weights must sum to 100', async () => {
  await login('BOU-SCH-77120')
  const bad = await call('POST', '/academic/schemes', {
    name: 'Broken', level: 'O_LEVEL', components: [{ key: 'a', label: 'A', weight: 30 }, { key: 'b', label: 'B', weight: 40 }],
  })
  assert.equal(bad.status, 422)
})

// ------------------------------------- period attendance, excuses, interventions ---

test('repeated unexcused absences open an attendance intervention automatically', async () => {
  await login('BOU-TEA-40871')
  // STD-A-003 (Grace) already has several absences seeded; add more to cross the threshold
  for (const date of ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']) {
    await call('POST', '/classes/CLS-A-001/attendance', { date, entries: [{ studentId: 'STD-A-003', status: 'absent' }] })
  }
  await login('BOU-SCH-77120')
  const list = d<{ studentId: string; kind: string; autoOpened: boolean; status: string }[]>(await call('GET', '/interventions'))
  const auto = list.find((i) => i.studentId === 'STD-A-003' && i.kind === 'attendance')
  assert.ok(auto, 'an attendance intervention was auto-opened')
  assert.equal(auto!.autoOpened, true)
})

test('excuse workflow: student requests, school approves, status becomes excused', async () => {
  await login('BOU-TEA-40871')
  await call('POST', '/classes/CLS-A-001/attendance', { date: '2026-09-10', entries: [{ studentId: 'STD-A-001', status: 'absent' }] })

  await login('BOU-STU-10231')
  const mine = d<{ id: string; date: string; status: string }[]>(await call('GET', '/students/STD-A-001/attendance'))
  const absence = mine.find((a) => a.date === '2026-09-10' && a.status === 'absent')!
  const req = d<{ excuseStatus: string }>(await call('POST', `/attendance/${absence.id}/excuse`, { reason: 'Medical appointment' }))
  assert.equal(req.excuseStatus, 'requested')

  await login('BOU-SCH-77120')
  const pending = d<{ id: string }[]>(await call('GET', '/attendance/excuses/pending'))
  assert.ok(pending.some((p) => p.id === absence.id))
  const reviewed = d<{ status: string; excuseStatus: string }>(await call('POST', `/attendance/${absence.id}/excuse/review`, { decision: 'approve' }))
  assert.equal(reviewed.status, 'excused')
  assert.equal(reviewed.excuseStatus, 'approved')
})

test('a guardian can request an excuse for a linked child', async () => {
  await login('BOU-TEA-40871')
  await call('POST', '/classes/CLS-A-001/attendance', { date: '2026-09-11', entries: [{ studentId: 'STD-A-001', status: 'absent' }] })
  await login('BOU-GDN-00001')
  const att = d<{ id: string; date: string }[]>(await call('GET', '/students/STD-A-001/attendance'))
  const a = att.find((x) => x.date === '2026-09-11')!
  const r = await call('POST', `/guardian/attendance/${a.id}/excuse`, { reason: 'Family event' })
  assert.equal(r.status, 200)
})

// ------------------------------------------------- former-institution read path ---

test('after a transfer, the origin institution keeps read access to the records it created', async () => {
  await login('BOU-SCH-77120')
  const tr = d<{ id: string }>(await call('POST', '/transfers', {
    studentId: 'STD-A-002', toOrganizationId: 'ORG-RW-SCH-000002', reason: 'Relocation',
    targetLevel: 'A_LEVEL', targetAcademicYear: '2026',
  }))
  await login('BOU-SCH-77121')
  await call('POST', `/transfers/${tr.id}/accept`, { note: 'ok' })

  // origin can still read STD-A-002's academic records — scoped to its own org's rows
  await login('BOU-SCH-77120')
  const acr = await call('GET', '/students/STD-A-002/academic')
  assert.equal(acr.status, 200)
  const rows = d<{ organizationId: string }[]>(acr)
  assert.ok(rows.length >= 1)
  assert.ok(rows.every((r) => r.organizationId === 'ORG-RW-SCH-000001'))
})
