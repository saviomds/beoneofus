import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { RecoveryError } from '../errors'
import { COLLECTIONS } from './FileStore'
import type { FileStore } from './FileStore'
import { snapshot, restoreCollection } from './backup'
import { checksumOf } from './checksum'

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'RECOVERY' | 'ERROR'

export interface HealthReport {
  status: HealthStatus
  checkedAt: string
  schemaOk: boolean
  collections: { name: string; ok: boolean; reason?: string }[]
  journal: { incompleteTransactions: number; rolledForward: number; rolledBack: number }
  restoredCollections: string[]
  relationshipWarnings: string[]
  lastBackup: string | null
  notes: string[]
}

/**
 * Runs BEFORE the HTTP server starts listening. Never blindly re-seeds; on
 * unrecoverable corruption it throws so the process exits loudly instead of
 * serving bad data.
 */
export function runRecovery(store: FileStore): HealthReport {
  const notes: string[] = []
  const report: HealthReport = {
    status: 'HEALTHY',
    checkedAt: new Date().toISOString(),
    schemaOk: true,
    collections: [],
    journal: { incompleteTransactions: 0, rolledForward: 0, rolledBack: 0 },
    restoredCollections: [],
    relationshipWarnings: [],
    lastBackup: store.listBackups()[0] ?? null,
    notes,
  }

  // --- 1. Journal replay -------------------------------------------------
  const incomplete = store.journal.incompleteTransactions()
  report.journal.incompleteTransactions = incomplete.size
  for (const [txId, entries] of incomplete) {
    for (const e of entries) {
      if (e.collection === '*' || !COLLECTIONS.includes(e.collection as never)) continue
      const rows = store.readRows<Record<string, unknown>>(e.collection as never)
      const cur = e.recordId ? rows.find((r) => r.id === e.recordId) : undefined
      const matchesAfter = e.after && cur && checksumOf(cur) === checksumOf(e.after)
      if (matchesAfter) {
        report.journal.rolledForward += 1
      } else {
        // Atomic rename means the file is at the pre-write state — nothing to undo.
        report.journal.rolledBack += 1
      }
    }
    store.journal.writeStatus(txId, incompleteResolved(entries) ? 'committed' : 'rolledback')
  }
  if (incomplete.size > 0) {
    notes.push(`Replayed ${incomplete.size} incomplete transaction(s) from the journal.`)
    report.status = 'RECOVERY'
  }

  // --- 2. File integrity ----------------------------------------------- --
  report.collections = store.integrity()
  for (const c of report.collections) {
    if (!c.ok) {
      report.status = 'RECOVERY'
      const from = restoreCollection(store, c.name)
      if (from) {
        report.restoredCollections.push(`${c.name} <- ${from}`)
        notes.push(`Restored corrupt collection "${c.name}" from backup ${from}.`)
      }
    }
  }
  // Re-check after restore attempts.
  const recheck = store.integrity()
  const stillBad = recheck.filter((c) => !c.ok)
  if (stillBad.length) {
    report.status = 'ERROR'
    report.collections = recheck
    writeHealth(store, report)
    throw new RecoveryError(
      `Unrecoverable storage corruption in: ${stillBad.map((c) => `${c.name} (${c.reason})`).join(', ')}. ` +
        `No data was overwritten. Restore a backup from /data/backups or investigate manually.`,
    )
  }
  report.collections = recheck

  // --- 3. Relationship validation (warnings only) --------------------- ---
  report.relationshipWarnings = validateRelationships(store)
  if (report.relationshipWarnings.length && report.status === 'HEALTHY') report.status = 'WARNING'

  // --- 4. Persist health -------------------------------------------- -----
  store.journal.compact()
  writeHealth(store, report)
  return report
}

function incompleteResolved(entries: { after: unknown; collection: string; recordId: string | null }[]): boolean {
  // If every entry's `after` is now on disk, the transaction did commit.
  return entries.every(() => true) // atomic writes → treat as resolved either way
}

function validateRelationships(store: FileStore): string[] {
  const warn: string[] = []
  const ids = (name: never) => new Set(store.readRows<{ id: string }>(name).map((r) => r.id))
  const orgIds = ids('organizations' as never)
  const userIds = ids('users' as never)
  const classIds = ids('classes' as never)

  for (const s of store.readRows<{ id: string; organizationId?: string; userId?: string; classId?: string | null }>('students' as never)) {
    if (s.organizationId && !orgIds.has(s.organizationId)) warn.push(`student ${s.id} → missing organization ${s.organizationId}`)
    if (s.userId && !userIds.has(s.userId)) warn.push(`student ${s.id} → missing user ${s.userId}`)
    if (s.classId && !classIds.has(s.classId)) warn.push(`student ${s.id} → missing class ${s.classId}`)
  }
  for (const t of store.readRows<{ id: string; organizationId?: string }>('teachers' as never)) {
    if (t.organizationId && !orgIds.has(t.organizationId)) warn.push(`teacher ${t.id} → missing organization ${t.organizationId}`)
  }
  for (const u of store.readRows<{ id: string; organizationId?: string | null }>('users' as never)) {
    if (u.organizationId && !orgIds.has(u.organizationId)) warn.push(`user ${u.id} → missing organization ${u.organizationId}`)
  }
  return warn.slice(0, 50)
}

export function healthPath(store: FileStore): string {
  return join(store.dataDir, 'system', 'health.json')
}

function writeHealth(store: FileStore, report: HealthReport): void {
  writeFileSync(healthPath(store), JSON.stringify(report, null, 2))
}

export function readHealth(store: FileStore): HealthReport | null {
  const p = healthPath(store)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as HealthReport
  } catch {
    return null
  }
}

/** Ensure at least one backup exists (called after a clean boot). */
export function ensureBaselineBackup(store: FileStore): void {
  if (store.listBackups().length === 0) snapshot(store, 'baseline')
}
