import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { StorageError } from '../errors'
import { COLLECTIONS } from './FileStore'
import type { FileStore } from './FileStore'

// Live login sessions are transient — never snapshot or restore them, so a
// restore does not sign everyone out.
const BACKUP_COLLECTIONS = COLLECTIONS.filter((c) => c !== 'authSessions')

export interface BackupManifest {
  id: string
  label: string
  createdAt: string
  counts: Record<string, number>
  fingerprint: string
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/** Full snapshot of every collection + the journal into /data/backups/<id>/. */
export function snapshot(store: FileStore, label = 'manual'): BackupManifest {
  const id = `${stamp()}-${label}`
  const dir = store.backupDir(id)
  mkdirSync(dir, { recursive: true })

  const counts: Record<string, number> = {}
  for (const name of BACKUP_COLLECTIONS) {
    const src = store.fileFor(name)
    if (existsSync(src)) {
      cpSync(src, join(dir, `${name}.json`))
      counts[name] = store.readFile(name)?.rows.length ?? 0
    }
  }
  const journalSrc = join(store.dataDir, 'system', 'journal.log')
  if (existsSync(journalSrc)) cpSync(journalSrc, join(dir, 'journal.log'))

  const manifest: BackupManifest = {
    id, label, createdAt: new Date().toISOString(), counts, fingerprint: store.fingerprint(),
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

export function listBackups(store: FileStore): BackupManifest[] {
  return store.listBackups().map((id) => {
    try {
      return JSON.parse(readFileSync(join(store.backupDir(id), 'manifest.json'), 'utf8')) as BackupManifest
    } catch {
      return { id, label: 'unknown', createdAt: '', counts: {}, fingerprint: '' }
    }
  })
}

/**
 * Restore a backup. ALWAYS takes a `pre-restore` safety snapshot of the current
 * state first, so a restore is itself reversible.
 */
export function restore(store: FileStore, backupId: string): { safetyBackup: string } {
  const dir = store.backupDir(backupId)
  if (!existsSync(join(dir, 'manifest.json'))) {
    throw new StorageError(`Backup not found: ${backupId}`)
  }
  const safety = snapshot(store, 'pre-restore')

  for (const name of BACKUP_COLLECTIONS) {
    const src = join(dir, `${name}.json`)
    if (existsSync(src)) {
      cpSync(src, store.fileFor(name))
    } else {
      store.removeCollectionFile(name)
    }
  }
  const journalBak = join(dir, 'journal.log')
  if (existsSync(journalBak)) cpSync(journalBak, join(store.dataDir, 'system', 'journal.log'))

  return { safetyBackup: safety.id }
}

/** Restore just one collection from the newest backup that contains it. */
export function restoreCollection(store: FileStore, name: string): string | null {
  for (const id of store.listBackups()) {
    const src = join(store.backupDir(id), `${name}.json`)
    if (existsSync(src)) {
      cpSync(src, join(store.dataDir, `${name}.json`))
      return id
    }
  }
  return null
}

export function pruneBackups(store: FileStore, keep = 30): void {
  const all = store.listBackups()
  for (const id of all.slice(keep)) {
    try {
      rmSync(store.backupDir(id), { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}
