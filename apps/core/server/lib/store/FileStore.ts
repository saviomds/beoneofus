import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync,
  openSync, fsyncSync, closeSync, rmSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'
import type { CollectionName } from '@shared/types'
import { StorageError } from '../errors'
import { Journal } from './journal'
import type { JournalOp } from './journal'
import { mutexFor } from './mutex'
import { wrap, verify, checksumOf, SCHEMA_VERSION } from './checksum'
import type { CollectionFile } from './checksum'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const DEFAULT_DATA_DIR = process.env.BOU_DATA_DIR || join(HERE, '..', '..', '..', 'data')
export const SEED_DIR = join(HERE, '..', '..', 'data', 'seed')

export const COLLECTIONS: CollectionName[] = [
  'organizations', 'users', 'students', 'teachers', 'mentors', 'mentorAssignments',
  'classes', 'subjects', 'enrollments', 'academicRecords', 'attendance',
  'faculties', 'departments', 'programs', 'courses',
  'reports', 'requests', 'transferRequests',
  'recordRequests', 'recordGrants', 'consents', 'campaigns', 'campaignSubmissions',
  'assessmentSchemes', 'assessments', 'reportCards', 'interventions', 'guardianLinks',
  'timetableSlots', 'applications', 'feeStructures', 'scholarships', 'invoices', 'payments',
  'sessions',
  'conversations', 'messages', 'notifications', 'documents', 'announcements',
  'credentials', 'invitations', 'auditLogs', 'settings', 'authSessions',
]

function atomicWrite(path: string, contents: string): void {
  const tmp = `${path}.${nanoid(6)}.tmp`
  const fd = openSync(tmp, 'w')
  try {
    writeFileSync(fd, contents)
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, path) // atomic on the same filesystem
}

export class FileStore {
  readonly dataDir: string
  readonly journal: Journal
  private globalVersion = 0

  constructor(dataDir: string = DEFAULT_DATA_DIR) {
    this.dataDir = dataDir
    mkdirSync(dataDir, { recursive: true })
    mkdirSync(join(dataDir, 'system'), { recursive: true })
    mkdirSync(join(dataDir, 'backups'), { recursive: true })
    this.journal = new Journal(join(dataDir, 'system', 'journal.log'))
  }

  fileFor(name: CollectionName): string {
    return join(this.dataDir, `${name}.json`)
  }

  /** True when no collection file exists yet (first boot). */
  isEmpty(): boolean {
    return !COLLECTIONS.some((c) => existsSync(this.fileFor(c)))
  }

  /** Copy seed JSON into the data dir, wrapped with schema/checksum. */
  seed(): void {
    if (!existsSync(SEED_DIR)) throw new StorageError(`Seed directory missing: ${SEED_DIR}`)
    for (const name of COLLECTIONS) {
      const seedPath = join(SEED_DIR, `${name}.json`)
      const rows = existsSync(seedPath) ? JSON.parse(readFileSync(seedPath, 'utf8')) : []
      this.globalVersion += 1
      atomicWrite(this.fileFor(name), JSON.stringify(wrap(rows, this.globalVersion), null, 2))
    }
  }

  readFile<T = unknown>(name: CollectionName): CollectionFile<T> | null {
    const path = this.fileFor(name)
    if (!existsSync(path)) return null
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as CollectionFile<T>
    } catch {
      return null
    }
  }

  readRows<T = unknown>(name: CollectionName): T[] {
    const file = this.readFile<T>(name)
    if (!file) {
      // Auto-create an empty collection so newly added collections don't crash.
      this.writeRawRows(name, [])
      return []
    }
    return file.rows
  }

  /** Low-level write with no journal entry (used by seeding / recovery / restore). */
  writeRawRows<T = unknown>(name: CollectionName, rows: T[]): void {
    this.globalVersion += 1
    atomicWrite(this.fileFor(name), JSON.stringify(wrap(rows, this.globalVersion), null, 2))
  }

  /**
   * The journaled, atomic, mutex-guarded write path used by the repository.
   * `mutate` receives the current rows and returns `{ rows, before, after, recordId }`.
   */
  async mutate<T>(
    name: CollectionName,
    actorId: string,
    op: JournalOp,
    fn: (rows: T[]) => { rows: T[]; before: unknown; after: unknown; recordId: string | null },
  ): Promise<{ before: unknown; after: unknown }> {
    return mutexFor(name).run(async () => {
      const current = this.readRows<T>(name)
      const { rows, before, after, recordId } = fn(current.map((r) => structuredClone(r)))
      const txId = nanoid(12)
      this.journal.writePending(txId, actorId, op, name, recordId, before, after)
      try {
        this.writeRawRows(name, rows)
        this.journal.writeStatus(txId, 'committed')
      } catch (err) {
        // Roll back: restore prior rows and mark the journal entry.
        try {
          this.writeRawRows(name, current)
        } catch {
          /* leave for recovery */
        }
        this.journal.writeStatus(txId, 'rolledback')
        throw new StorageError(`Write to ${name} failed: ${(err as Error).message}`)
      }
      return { before, after }
    })
  }

  /** Verify every collection file parses and its checksum matches. */
  integrity(): { name: CollectionName; ok: boolean; reason?: string }[] {
    return COLLECTIONS.map((name) => {
      const path = this.fileFor(name)
      if (!existsSync(path)) return { name, ok: true, reason: 'absent (will init empty)' }
      try {
        const file = JSON.parse(readFileSync(path, 'utf8')) as CollectionFile
        if (file.schema !== SCHEMA_VERSION) return { name, ok: true, reason: `schema ${file.schema}` }
        return verify(file)
          ? { name, ok: true }
          : { name, ok: false, reason: 'checksum mismatch' }
      } catch (e) {
        return { name, ok: false, reason: `parse error: ${(e as Error).message}` }
      }
    })
  }

  listBackups(): string[] {
    const dir = join(this.dataDir, 'backups')
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter((d) => existsSync(join(dir, d, 'manifest.json'))).sort().reverse()
  }

  backupDir(id: string): string {
    return join(this.dataDir, 'backups', id)
  }

  removeCollectionFile(name: CollectionName): void {
    const p = this.fileFor(name)
    if (existsSync(p)) rmSync(p)
  }

  get currentGlobalVersion(): number {
    return this.globalVersion
  }

  /** Cheap sha for quick "did anything change" checks. */
  fingerprint(): string {
    return checksumOf(COLLECTIONS.map((c) => this.readFile(c)?.checksum ?? ''))
  }
}
