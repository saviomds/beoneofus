// Tranche A — inter-institution connectivity:
//   credential verification (public), record requests + consent + grants,
//   record-carrying transfers, government data campaigns.
//
// Isolated in-process server on a temp data dir, same harness as platform.test.ts.

import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
const DATA_DIR = mkdtempSync(join(tmpdir(), 'bou-net-'))
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
let govCode = 'BOU-GOV-00042'
const login = async (code: string, password = 'demo123') => {
  cookie = ''
  const r = await call('POST', '/auth/login', { code, password })
  const u = (r.body.data as { user?: { role: string; code: string } } | undefined)?.user
  if (u?.role === 'government') govCode = u.code
  return r
}
const anon = () => { cookie = '' }

const ORG_A = 'ORG-RW-SCH-000001'
const ORG_B = 'ORG-RW-SCH-000002'

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

// ----------------------------------------- credential verification (public) ---

test('a seeded credential verifies publicly with no authentication and no PII leak', async () => {
  anon()
  const r = await call('GET', '/verify/BOU-CRD-8842-AX')
  assert.equal(r.status, 200)
  const v = d<Record<string, unknown>>(r)
  assert.equal(v.valid, true)
  assert.equal(v.credentialTitle, 'Web Development — Level 1')
  assert.ok(typeof v.holderName === 'string' && (v.holderName as string).length > 0)
  // nothing sensitive
  for (const k of ['address', 'phone', 'guardianName', 'score', 'grade', 'dateOfBirth', 'studentId', 'email']) {
    assert.equal(k in v, false, `public result must not contain ${k}`)
  }
})

test('an unknown verification code returns valid:false, not an error', async () => {
  anon()
  const r = await call('GET', '/verify/NOPE-0000-0000')
  assert.equal(r.status, 200)
  assert.equal(d<{ valid: boolean }>(r).valid, false)
})

test('issuing then revoking a credential is reflected by the public verifier', async () => {
  await login('BOU-SCH-77120')
  const issued = d<{ id: string; verificationCode: string }>(await call('POST', '/credentials', {
    studentId: 'STD-A-002', title: 'Data Structures — Level 1', type: 'certificate',
  }))
  assert.match(issued.verificationCode, /^BOU-CRD-/)

  anon()
  assert.equal(d<{ valid: boolean }>(await call('GET', `/verify/${issued.verificationCode}`)).valid, true)

  await login('BOU-SCH-77120')
  await call('POST', `/credentials/${issued.id}/revoke`, { reason: 'issued in error' })

  anon()
  const after = d<{ valid: boolean; status: string }>(await call('GET', `/verify/${issued.verificationCode}`))
  assert.equal(after.valid, false)
  assert.equal(after.status, 'revoked')
})

test('one school cannot issue a credential for another school’s student', async () => {
  await login('BOU-SCH-77121') // School B
  const r = await call('POST', '/credentials', { studentId: 'STD-A-002', title: 'x', type: 'badge' })
  assert.ok(r.status === 403, `expected 403, got ${r.status}`)
})

// ------------------------------------------------- record requests + consent ---

test('records stay private until a request is approved, then become readable, then revocable', async () => {
  // School B has no access to a School A student's academics
  await login('BOU-SCH-77121')
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)

  const req = d<{ id: string; status: string }>(await call('POST', '/record-requests', {
    studentId: 'STD-A-002', sourceOrganizationId: ORG_A,
    requestedRecordTypes: ['ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY'],
    purpose: 'Admission assessment', legalBasis: 'Guardian consent on file',
  }))
  assert.equal(req.status, 'SUBMITTED')

  // still no access while pending
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)

  // School B cannot review its own outgoing request (it is not the record holder)
  const selfReview = await call('POST', `/record-requests/${req.id}/review`, { decision: 'approve', legalBasis: 'x' })
  assert.equal(selfReview.status, 403)

  // School A reviews and approves
  await login('BOU-SCH-77120')
  const incoming = d<{ incoming: { id: string }[] }>(await call('GET', '/record-requests'))
  assert.ok(incoming.incoming.some((r) => r.id === req.id))
  const approved = d<{ status: string; grantId: string }>(await call('POST', `/record-requests/${req.id}/review`, {
    decision: 'approve', legalBasis: 'Statutory records transfer', expiresInDays: 30,
  }))
  assert.equal(approved.status, 'APPROVED')
  assert.ok(approved.grantId)

  // now School B can read the approved categories (read-only, cross-institution)
  await login('BOU-SCH-77121')
  const acr = await call('GET', '/students/STD-A-002/academic')
  assert.equal(acr.status, 200)
  assert.ok(d<unknown[]>(acr).length >= 1)
  // but NOT a category that wasn't requested
  assert.equal((await call('GET', '/students/STD-A-002/reports')).status, 403)

  // School A revokes; access is withdrawn immediately
  await login('BOU-SCH-77120')
  await call('POST', `/record-requests/${req.id}/revoke`, { note: 'no longer required' })
  await login('BOU-SCH-77121')
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)
})

test('an approval backed by consent is voided when the consent is withdrawn', async () => {
  await login('BOU-SCH-77121')
  const req = d<{ id: string }>(await call('POST', '/record-requests', {
    studentId: 'STD-A-003', sourceOrganizationId: ORG_A,
    requestedRecordTypes: ['ACADEMIC_RECORDS'], purpose: 'Transfer', legalBasis: '',
  }))

  await login('BOU-SCH-77120')
  const consent = d<{ id: string }>(await call('POST', '/consents', {
    studentId: 'STD-A-003', requestingOrganizationId: ORG_B, scopeRecordTypes: ['ACADEMIC_RECORDS'],
    grantedByName: 'Claudine Mutoni', grantedByRelationship: 'guardian', purpose: 'Transfer', legalBasis: 'Written consent',
  }))
  const approved = await call('POST', `/record-requests/${req.id}/review`, { decision: 'approve', consentId: consent.id })
  assert.equal(approved.status, 200)

  await login('BOU-SCH-77121')
  assert.equal((await call('GET', '/students/STD-A-003/academic')).status, 200)

  await login('BOU-SCH-77120')
  await call('POST', `/consents/${consent.id}/withdraw`, { note: 'guardian revoked' })

  await login('BOU-SCH-77121')
  assert.equal((await call('GET', '/students/STD-A-003/academic')).status, 403)
})

test('an expired grant no longer confers access', async () => {
  await login('BOU-SCH-77121')
  const req = d<{ id: string }>(await call('POST', '/record-requests', {
    studentId: 'STD-A-002', sourceOrganizationId: ORG_A,
    requestedRecordTypes: ['ACADEMIC_RECORDS'], purpose: 'x', legalBasis: 'y',
  }))
  await login('BOU-SCH-77120')
  const approved = d<{ grantId: string }>(await call('POST', `/record-requests/${req.id}/review`, { decision: 'approve', legalBasis: 'y' }))

  // backdate the grant's expiry
  const { recordGrantsRepo } = await import('../lib/db.ts')
  await recordGrantsRepo.update(approved.grantId, { expiresAt: new Date(Date.now() - 1000).toISOString() }, { actorId: 'system' })

  await login('BOU-SCH-77121')
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)
})

// -------------------------------------------------- transfer carries records ---

test('an accepted transfer shares the origin’s records with the receiving school', async () => {
  await login('BOU-SCH-77120')
  const tr = d<{ id: string }>(await call('POST', '/transfers', {
    studentId: 'STD-A-001', toOrganizationId: ORG_B, reason: 'Family relocation',
    targetLevel: 'A_LEVEL', targetAcademicYear: '2026',
  }))

  await login('BOU-SCH-77121')
  const done = d<{ status: string }>(await call('POST', `/transfers/${tr.id}/accept`, { note: 'welcome' }))
  assert.equal(done.status, 'COMPLETED')

  // receiving school can now read the student's academic history
  const acr = await call('GET', '/students/STD-A-001/academic')
  assert.equal(acr.status, 200)

  // a STUDENT_TRANSFER grant was recorded
  const { recordGrantsRepo } = await import('../lib/db.ts')
  const grants = (await recordGrantsRepo.list({ studentId: 'STD-A-001' })) as { reason: string; recipientOrganizationId: string }[]
  assert.ok(grants.some((g) => g.reason === 'STUDENT_TRANSFER' && g.recipientOrganizationId === ORG_B))
})

// ---------------------------------------------------- government campaigns -----

test('a campaign publishes to institutions, collects submissions and reports completion', async () => {
  await login(govCode)
  const created = d<{ id: string; status: string }>(await call('POST', '/campaigns', {
    title: 'Test enrolment return', description: 'unit test',
    dueAt: new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10),
    audienceOrganizationTypes: ['SCHOOL'],
    fields: [{ label: 'Total students', type: 'integer', required: true }, { label: 'Notes', type: 'text', required: false }],
  }))
  assert.equal(created.status, 'DRAFT')

  const published = d<{ status: string; targetOrganizationIds: string[] }>(await call('POST', `/campaigns/${created.id}/publish`))
  assert.equal(published.status, 'OPEN')
  assert.ok(published.targetOrganizationIds.includes(ORG_A))
  assert.ok(published.targetOrganizationIds.includes(ORG_B))

  // School A responds
  await login('BOU-SCH-77120')
  const seen = d<{ id: string }[]>(await call('GET', '/campaigns'))
  assert.ok(seen.some((c) => c.id === created.id))
  const { submission } = d<{ submission: { id: string; status: string } }>(await call('GET', `/campaigns/${created.id}/submission`))
  assert.equal(submission.status, 'NOT_STARTED')
  await call('PUT', `/campaigns/${created.id}/submission`, { data: { total_students: 512 } })
  const submitted = await call('POST', `/campaigns/${created.id}/submit`)
  assert.equal(submitted.status, 200)

  // School A cannot see the government review dashboard
  assert.equal((await call('GET', `/campaigns/${created.id}/dashboard`)).status, 403)

  // government sees 1 of N submitted, then approves it
  await login(govCode)
  const dash = d<{ assigned: number; totals: Record<string, number> }>(await call('GET', `/campaigns/${created.id}/dashboard`))
  assert.ok(dash.assigned >= 2)
  assert.equal(dash.totals.SUBMITTED, 1)

  const subs = d<{ id: string; organizationId: string; status: string }[]>(await call('GET', `/campaigns/${created.id}/submissions`))
  const target = subs.find((s) => s.status === 'SUBMITTED')!
  const reviewed = d<{ status: string }>(await call('POST', `/campaign-submissions/${target.id}/review`, { decision: 'approve', note: 'ok' }))
  assert.equal(reviewed.status, 'APPROVED')

  const dash2 = d<{ totals: Record<string, number> }>(await call('GET', `/campaigns/${created.id}/dashboard`))
  assert.equal(dash2.totals.APPROVED, 1)
})

test('a school cannot submit a campaign it was not assigned, and required fields are enforced', async () => {
  await login(govCode)
  const c = d<{ id: string }>(await call('POST', '/campaigns', {
    title: 'Universities only', dueAt: new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10),
    audienceOrganizationTypes: ['UNIVERSITY'],
    fields: [{ label: 'Headcount', type: 'integer', required: true }],
  }))
  await call('POST', `/campaigns/${c.id}/publish`)

  // School A was not in the audience
  await login('BOU-SCH-77120')
  assert.ok((await call('GET', `/campaigns/${c.id}/submission`)).status >= 400)

  // University is; submitting empty fails validation
  await login('BOU-ORG-UNI-00001')
  const empty = await call('POST', `/campaigns/${c.id}/submit`)
  assert.equal(empty.status, 422)
})
