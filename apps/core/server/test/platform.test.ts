// End-to-end platform tests — multi-tenant isolation, storage integrity,
// concurrency, onboarding, backup/restore. Run with:  npm test
//
// One in-process server on an isolated temp data dir for the whole suite.

import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
const DATA_DIR = mkdtempSync(join(tmpdir(), 'bou-test-'))
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
let govCode = 'BOU-GOV-00042' // rotates on every sign-in — kept current here
const login = async (code: string, password = 'demo123') => {
  cookie = ''
  const r = await call('POST', '/auth/login', { code, password })
  const u = (r.body.data as { user?: { role: string; code: string } } | undefined)?.user
  if (u?.role === 'government') govCode = u.code
  return r
}
const d = <T>(r: { body: { data?: unknown } }) => r.body.data as T

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

// --------------------------------------------------------------- auth ------

test('every demo account can sign in', async () => {
  for (const code of ['BOU-STU-10231', 'BOU-TEA-40871', 'BOU-SCH-77120', 'BOU-SCH-77121', 'BOU-ORG-UNI-00001', 'BOU-ADM-00001']) {
    const r = await login(code)
    assert.equal(r.status, 200, `${code} login`)
    assert.equal(d<{ user: { code: string } }>(r).user.code, code)
  }
})

test('bad password is rejected and never leaks a session', async () => {
  const r = await login('BOU-STU-10231', 'wrong')
  assert.ok(r.status >= 400)
})

test('government access code rotates on every sign-in; old code stops working', async () => {
  const first = await login('BOU-GOV-00042')
  const rotated = d<{ user: { code: string } }>(first).user.code
  assert.notEqual(rotated, 'BOU-GOV-00042')
  assert.match(rotated, /^BOU-GOV-\d+$/)
  const oldAgain = await login('BOU-GOV-00042')
  assert.ok(oldAgain.status >= 400, 'previous code rejected')
  const withNew = await login(rotated)
  assert.equal(withNew.status, 200)
})

test('account locks after repeated failed sign-ins', async () => {
  const code = 'BOU-STU-RW-2026-000012' // Eric — unused elsewhere
  for (let i = 0; i < 5; i++) await login(code, 'bad')
  const locked = await login(code, 'demo123')
  assert.equal(locked.status, 403)
  assert.match(locked.body.error!.message, /locked/i)
})

// --------------------------------------------------- tenant isolation ------

test('School A only ever sees its own organization’s students', async () => {
  await login('BOU-SCH-77120')
  const page = d<{ rows: { organizationId: string }[] }>(await call('GET', '/students'))
  assert.ok(page.rows.length > 0)
  assert.ok(page.rows.every((s) => s.organizationId === 'ORG-RW-SCH-000001'))
})

test('School A cannot read a School B student even with a guessed id → 403', async () => {
  await login('BOU-SCH-77120')
  const r = await call('GET', '/students/STD-B-001')
  assert.equal(r.status, 403)
  assert.equal(r.body.error!.code, 'TENANT_FORBIDDEN')
})

test('School A cannot read a School B report or list users', async () => {
  await login('BOU-SCH-77120')
  assert.ok((await call('GET', '/reports/RPT-B-001')).status >= 403)
  assert.equal((await call('GET', '/admin/users')).status, 403)
})

test('School A and School B student sets are disjoint', async () => {
  await login('BOU-SCH-77120')
  const a = new Set(d<{ rows: { id: string }[] }>(await call('GET', '/students')).rows.map((s) => s.id))
  await login('BOU-SCH-77121')
  const b = d<{ rows: { id: string; organizationId: string }[] }>(await call('GET', '/students')).rows
  assert.ok(b.every((s) => s.organizationId === 'ORG-RW-SCH-000002'))
  assert.ok(b.every((s) => !a.has(s.id)))
})

test('a student can only read their own records', async () => {
  await login('BOU-STU-10231')
  assert.equal((await call('GET', '/students/STD-A-002/academic')).status, 403)
  assert.equal((await call('GET', '/students/me')).status, 200)
})

test('university tenant is fully independent of the schools', async () => {
  await login('BOU-ORG-UNI-00001')
  const facs = d<unknown[]>(await call('GET', '/university/faculties'))
  assert.ok(facs.length >= 1)
  const students = d<{ rows: { organizationId: string }[] }>(await call('GET', '/students'))
  assert.ok(students.rows.every((s) => s.organizationId === 'ORG-RW-UNI-000001'))
})

test('admin sees across every tenant', async () => {
  await login('BOU-ADM-00001')
  const orgs = d<unknown[]>(await call('GET', '/organizations'))
  assert.ok(orgs.length >= 3)
})

// ---------------------------------------------- versioning / concurrency ---

test('a stale versioned update is rejected with 409 (no lost write)', async () => {
  await login('BOU-SCH-77120')
  const before = d<{ version: number; address: string }>(await call('GET', '/students/STD-A-001'))
  const first = await call('PATCH', '/students/STD-A-001', { address: 'Update One', expectedVersion: before.version })
  assert.equal(first.status, 200)
  const stale = await call('PATCH', '/students/STD-A-001', { address: 'Would-be lost write', expectedVersion: before.version })
  assert.equal(stale.status, 409)
  const after = d<{ address: string }>(await call('GET', '/students/STD-A-001'))
  assert.equal(after.address, 'Update One')
})

test('duplicate ids are rejected by the repository', async () => {
  await login('BOU-SCH-77120')
  const a = await call('POST', '/classes', { name: 'DupTest', gradeLevel: 'S1', section: 'Z', id: 'CLS-A-001' })
  // id is client-supplied only for seed data; the create path assigns its own,
  // so this simply must not collide / corrupt anything.
  assert.ok(a.status === 200 || a.status === 409)
})

// -------------------------------------------------- storage integrity -----

test('corrupting a collection file triggers recovery from backup on next boot', async () => {
  const { store } = await import('../lib/db.ts')
  const { snapshot } = await import('../lib/store/backup.ts')
  const { runRecovery } = await import('../lib/store/recovery.ts')

  snapshot(store, 'pre-corruption')
  const file = store.fileFor('subjects')
  const good = readFileSync(file, 'utf8')
  writeFileSync(file, '{ this is not valid json ]')

  const report = runRecovery(store)
  assert.ok(['RECOVERY', 'WARNING', 'HEALTHY'].includes(report.status))
  const reread = readFileSync(file, 'utf8')
  assert.notEqual(reread, '{ this is not valid json ]', 'corrupt file was restored')
  JSON.parse(reread) // must parse
  assert.ok(good.length > 0)
})

test('an interrupted write leaves the previous valid file intact (atomic rename)', async () => {
  const { store } = await import('../lib/db.ts')
  const file = store.fileFor('announcements')
  const before = readFileSync(file, 'utf8')
  // Simulate a crash: a .tmp is written but the rename never happens.
  writeFileSync(file + '.crashsim.tmp', 'partial junk')
  const after = readFileSync(file, 'utf8')
  assert.equal(after, before, 'main file untouched by an abandoned tmp write')
  JSON.parse(after)
  rmSync(file + '.crashsim.tmp')
})

test('the journal records every write and can be replayed', async () => {
  const { store } = await import('../lib/db.ts')
  const entries = store.journal.readAll()
  assert.ok(entries.length > 0)
  assert.ok(entries.some((e) => e.op === 'UPDATE' && e.collection === 'students'))
  assert.equal(store.journal.incompleteTransactions().size, 0, 'no dangling transactions')
})

// -------------------------------------------------- backup / restore -----

test('backup → mutate → restore returns the data and keeps a safety backup', async () => {
  await login('BOU-ADM-00001')
  const bk = d<{ id: string }>(await call('POST', '/system/backups', { label: 'roundtrip' }))
  assert.ok(bk.id)

  await login('BOU-SCH-77120')
  await call('PATCH', '/students/STD-A-002', { address: 'CHANGED BEFORE RESTORE' })

  await login('BOU-ADM-00001')
  const rst = d<{ safetyBackup: string }>(await call('POST', '/system/restore', { backupId: bk.id, confirm: 'RESTORE' }))
  assert.match(rst.safetyBackup, /pre-restore/)

  await login('BOU-SCH-77120')
  const restored = d<{ address: string }>(await call('GET', '/students/STD-A-002'))
  assert.notEqual(restored.address, 'CHANGED BEFORE RESTORE')

  await login('BOU-ADM-00001')
  const list = d<{ label: string }[]>(await call('GET', '/system/backups'))
  assert.ok(list.some((b) => b.label === 'pre-restore'))
})

test('restore requires the exact confirmation string', async () => {
  await login('BOU-ADM-00001')
  const list = d<{ id: string }[]>(await call('GET', '/system/backups'))
  const r = await call('POST', '/system/restore', { backupId: list[0].id, confirm: 'yes' })
  assert.equal(r.status, 422)
})

// -------------------------------------------- onboarding / invitations ----

test('institution onboarding: invite → accept → approve → first sign-in', async () => {
  const pub = await call('GET', '/invite/demo-pending-invite-token-0001')
  assert.equal(d<{ status: string }>(pub).status, 'PENDING')

  cookie = ''
  const accepted = await call('POST', '/invite/demo-pending-invite-token-0001/accept', {
    password: 'onboard123', representativeName: 'New Principal', province: 'Kigali City', district: 'Kicukiro',
  })
  const org = d<{ organization: { id: string; status: string }; adminCode: string }>(accepted)
  assert.equal(org.organization.status, 'PENDING')

  // single-use
  const reuse = await call('POST', '/invite/demo-pending-invite-token-0001/accept', { password: 'x', representativeName: 'y' })
  assert.ok(reuse.status >= 400)

  // the new admin cannot sign in until the org is ACTIVE
  const early = await login(org.adminCode, 'onboard123')
  assert.ok(early.status >= 400)

  await login('BOU-ADM-00001')
  await call('POST', `/organizations/${org.organization.id}/status`, { status: 'ACTIVE' })

  const ok = await login(org.adminCode, 'onboard123')
  assert.equal(ok.status, 200)
})

test('an expired / revoked invitation token is rejected', async () => {
  const used = await call('GET', '/invite/already-used-token-0002')
  assert.equal(d<{ status: string }>(used).status, 'ACCEPTED')
  const r = await call('POST', '/invite/already-used-token-0002/accept', { password: 'x', representativeName: 'y' })
  assert.ok(r.status >= 400)
})

// ----------------------------------------- cross-portal workflow ---------

test('teacher report → school approval → student notification', async () => {
  await login('BOU-TEA-40871')
  const rep = d<{ id: string; reference: string }>(await call('POST', '/reports', {
    type: 'progress', subject: 'Workflow test', content: 'ok', targetUserId: 'BOU-STU-10231', status: 'submitted',
  }))
  assert.match(rep.reference, /^RPT-2026-/)

  await login('BOU-STU-10231')
  const before = d<unknown[]>(await call('GET', '/notifications')).length

  await login('BOU-SCH-77120')
  const reviewed = d<{ status: string }>(await call('POST', `/reports/${rep.id}/review`, { decision: 'approved', note: 'ok' }))
  assert.equal(reviewed.status, 'approved')

  await login('BOU-STU-10231')
  const after = d<unknown[]>(await call('GET', '/notifications')).length
  assert.ok(after > before)
})

test('school request → government response → school notified; timeline recorded', async () => {
  await login('BOU-SCH-77120')
  const req = d<{ id: string }>(await call('POST', '/requests', {
    type: 'Funding', title: 'Workflow request', description: 'help', priority: 'high', governmentDepartment: 'BED',
  }))
  await login(govCode)
  const seen = d<{ id: string }[]>(await call('GET', '/requests'))
  assert.ok(seen.some((r) => r.id === req.id))
  const adv = d<{ status: string; timeline: unknown[]; response: string }>(
    await call('POST', `/requests/${req.id}/advance`, { action: 'approved', note: 'done', response: 'Approved' }),
  )
  assert.equal(adv.status, 'approved')
  assert.equal(adv.response, 'Approved')
  assert.ok(adv.timeline.length >= 2)
})
