// Tranche C — timetable, admissions, finance, CSV bulk import, year-end batch,
// plus server-side PDF export.

import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
const DATA_DIR = mkdtempSync(join(tmpdir(), 'bou-ops-'))
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
  try { json = (await res.json()) as typeof json } catch { /* non-json */ }
  return { status: res.status, body: json }
}
async function raw(path: string) {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {} })
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, contentType: res.headers.get('content-type') ?? '', head: buf.subarray(0, 5).toString('latin1'), bytes: buf.length }
}
const d = <T>(r: { body: { data?: unknown } }) => r.body.data as T
const login = async (code: string, password = 'demo123') => { cookie = ''; return call('POST', '/auth/login', { code, password }) }

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
  try { rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* ignore */ }
})

// ------------------------------------------------------------- timetable ---

test('a timetable slot supplies the subject for period-level attendance', async () => {
  await login('BOU-SCH-77120')
  const slot = d<{ id: string }>(await call('POST', '/timetable', {
    classId: 'CLS-A-001', dayOfWeek: 3, period: 3, startTime: '10:00', endTime: '10:50', subjectId: 'SUB-A-001',
  }))
  assert.ok(slot.id)
  // clash rejected
  assert.equal((await call('POST', '/timetable', { classId: 'CLS-A-001', dayOfWeek: 3, period: 3, startTime: '10:00', endTime: '10:50' })).status, 422)

  await login('BOU-TEA-40871')
  // 2026-09-02 is a Wednesday -> dayOfWeek 3
  await call('POST', '/classes/CLS-A-001/attendance', { date: '2026-09-02', period: 3, entries: [{ studentId: 'STD-A-001', status: 'present' }] })
  const rows = d<{ date: string; period: number; subjectId: string | null }[]>(await call('GET', '/students/STD-A-001/attendance'))
  const rec = rows.find((r) => r.date === '2026-09-02' && r.period === 3)!
  assert.equal(rec.subjectId, 'SUB-A-001')
})

// ------------------------------------------------------------ admissions ---

test('an application flows to an enrolment and creates the student exactly once', async () => {
  await login('BOU-SCH-77120')
  const before = d<{ rows: unknown[] }>(await call('GET', '/students')).rows.length

  const app = d<{ id: string; status: string }>(await call('POST', '/applications', {
    applicantFirstName: 'Test', applicantLastName: 'Applicant', gradeApplyingFor: 'S4', level: 'A_LEVEL',
    guardianName: 'A Guardian', submit: true,
  }))
  assert.equal(app.status, 'SUBMITTED')

  await call('POST', `/applications/${app.id}/review`, { decision: 'offer' })
  await call('POST', `/applications/${app.id}/accept-offer`, {})
  const enrolled = d<{ application: { status: string; studentId: string }; student: { id: string } }>(await call('POST', `/applications/${app.id}/enroll`, {}))
  assert.equal(enrolled.application.status, 'ENROLLED')
  assert.ok(enrolled.student.id)

  const after = d<{ rows: unknown[] }>(await call('GET', '/students')).rows.length
  assert.equal(after, before + 1)

  // re-enrolling is idempotent — no second student
  const again = d<{ student: { id: string } }>(await call('POST', `/applications/${app.id}/enroll`, {}))
  assert.equal(again.student.id, enrolled.student.id)
  assert.equal(d<{ rows: unknown[] }>(await call('GET', '/students')).rows.length, after)
})

// -------------------------------------------------------------- finance ---

test('invoice total, partial payment, paid status, overpay guard, and student visibility', async () => {
  await login('BOU-SCH-77120')
  const fs = d<{ id: string; total: number }>(await call('POST', '/finance/fee-structures', {
    name: 'Test fees', level: 'A_LEVEL', academicYear: '2026',
    items: [{ label: 'Tuition', amount: 200000 }, { label: 'Meals', amount: 50000 }],
  }))
  assert.equal(fs.total, 250000)

  const inv = d<{ id: string; total: number; status: string }>(await call('POST', '/finance/invoices', {
    studentId: 'STD-A-002', feeStructureId: fs.id, term: 'Term 3 2026', academicYear: '2026',
  }))
  assert.equal(inv.total, 250000)
  assert.equal(inv.status, 'PENDING')

  const p1 = d<{ invoice: { status: string; paidAmount: number } }>(await call('POST', '/finance/payments', { invoiceId: inv.id, amount: 100000, method: 'cash' }))
  assert.equal(p1.invoice.status, 'PARTIALLY_PAID')
  assert.equal(p1.invoice.paidAmount, 100000)

  // overpay rejected
  assert.equal((await call('POST', '/finance/payments', { invoiceId: inv.id, amount: 999999, method: 'cash' })).status, 422)

  const p2 = d<{ invoice: { status: string } }>(await call('POST', '/finance/payments', { invoiceId: inv.id, amount: 150000, method: 'bank_transfer' }))
  assert.equal(p2.invoice.status, 'PAID')

  // the student sees only their own invoice
  await login('BOU-STU-RW-2026-000012') // Eric = STD-A-002
  const mine = d<{ studentId: string }[]>(await call('GET', '/finance/invoices'))
  assert.ok(mine.length >= 1 && mine.every((i) => i.studentId === 'STD-A-002'))
  // a different student cannot open it
  await login('BOU-STU-10231')
  assert.equal((await call('GET', `/finance/invoices/${inv.id}`)).status, 404)
})

// -------------------------------------------------------- CSV bulk import ---

test('CSV import validates row-by-row and commits only the valid rows', async () => {
  await login('BOU-SCH-77120')
  const csv = [
    'first_name,last_name,grade_level,level,email',
    'Grace,Newman,S1,O_LEVEL,grace.newman@example.rw',
    'Bad,Row,,,',
    'Henry,Field,S2,O_LEVEL,henry.field@example.rw',
  ].join('\n')

  const v = d<{ total: number; failed: number; rows: { ok: boolean }[] }>(await call('POST', '/import/students/validate', { csv }))
  assert.equal(v.total, 3)
  assert.equal(v.failed, 1)

  const r = d<{ created: number; failed: number }>(await call('POST', '/import/students/commit', { csv }))
  assert.equal(r.created, 2)
  assert.equal(r.failed, 1)
})

test('teacher import rejects a duplicate email', async () => {
  await login('BOU-SCH-77120')
  const csv = 'first_name,last_name,email\nDom,Two,d.savio@kia.ac.rw' // already a KIA teacher
  const v = d<{ failed: number }>(await call('POST', '/import/teachers/validate', { csv }))
  assert.equal(v.failed, 1)
})

// ---------------------------------------------------------- year-end batch ---

test('batch promotion advances a class and graduates the top of the ladder', async () => {
  await login('BOU-SCH-77120')
  // S6 is the top of A_LEVEL — STD-A-002 (Eric) is S6 in CLS-A-002
  const preview = d<{ studentId: string; action: string }[]>(await call('POST', '/batch/promotion/preview', { classId: 'CLS-A-002' }))
  assert.ok(preview.length >= 1)
  assert.ok(preview.find((p) => p.studentId === 'STD-A-002')?.action === 'graduate')

  const r = d<{ promoted: number; graduated: number }>(await call('POST', '/batch/promotion/commit', { classId: 'CLS-A-002', toAcademicYear: '2027' }))
  assert.ok(r.graduated >= 1)
})

// ------------------------------------------------------------------- PDF ---

test('a report card and a transcript export as real PDF bytes, audited', async () => {
  await login('BOU-SCH-77120')
  await call('POST', '/report-cards/generate', { classId: 'CLS-A-001', term: 'Term 2 2026', academicYear: '2026' })
  const cards = d<{ id: string; studentId: string }[]>(await call('GET', '/report-cards?classId=CLS-A-001&term=Term%202%202026'))
  const card = cards[0]

  const pdf = await raw(`/report-cards/${card.id}/pdf`)
  assert.equal(pdf.status, 200)
  assert.match(pdf.contentType, /application\/pdf/)
  assert.equal(pdf.head, '%PDF-')
  assert.ok(pdf.bytes > 500)

  const t = await raw(`/students/${card.studentId}/transcript.pdf`)
  assert.equal(t.head, '%PDF-')

  await login('BOU-ADM-00001')
  const audit = d<{ action: string }[]>(await call('GET', '/audit?action=REPORT_CARD_EXPORTED'))
  assert.ok(audit.some((a) => a.action === 'REPORT_CARD_EXPORTED'))
})
