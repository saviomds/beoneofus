import { store } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService } from './_shared'
import { snapshot, listBackups, restore } from '../lib/store/backup'
import { runRecovery, readHealth } from '../lib/store/recovery'
import { authSessionsRepo } from '../lib/db'
import { ValidationError } from '../lib/errors'
import type { SafeUser, SessionRecord } from '@shared/types'

export const systemService = {
  async health(actor: SafeUser) {
    assertPermission(actor, P.SYSTEM_HEALTH)
    const stored = readHealth(store)
    const integrity = store.integrity()
    const journal = store.journal.readAll()
    const failed = journal.filter((j) => j.status === 'rolledback').length
    const sessions = ((await authSessionsRepo.list()) as SessionRecord[]).filter((s) => s.expiresAt > Date.now())
    return {
      status: stored?.status ?? (integrity.every((c) => c.ok) ? 'HEALTHY' : 'ERROR'),
      lastRecoveryReport: stored,
      integrity,
      journal: {
        entries: journal.length,
        rolledBack: failed,
        incompleteTransactions: store.journal.incompleteTransactions().size,
      },
      lastBackup: store.listBackups()[0] ?? null,
      backupCount: store.listBackups().length,
      activeSessions: sessions.length,
      dataDir: store.dataDir,
      collections: integrity.map((c) => ({ name: c.name, ok: c.ok, rows: store.readFile(c.name)?.rows.length ?? 0 })),
    }
  },

  async recheck(actor: SafeUser) {
    assertPermission(actor, P.SYSTEM_HEALTH)
    const report = runRecovery(store)
    await auditService.record({ actor, action: 'INTEGRITY_RECHECK', result: report.status === 'ERROR' ? 'ERROR' : 'SUCCESS', metadata: { status: report.status } })
    return report
  },

  async backups(actor: SafeUser) {
    assertPermission(actor, P.BACKUP_MANAGE)
    return listBackups(store)
  },

  async createBackup(actor: SafeUser, label = 'manual') {
    assertPermission(actor, P.BACKUP_MANAGE)
    const m = snapshot(store, label.replace(/[^a-z0-9-]/gi, '') || 'manual')
    await auditService.record({ actor, action: 'BACKUP_CREATED', targetId: m.id, targetType: 'backup', metadata: { counts: m.counts } })
    return m
  },

  async restoreBackup(actor: SafeUser, backupId: string, confirm: string) {
    assertPermission(actor, P.BACKUP_MANAGE)
    if (confirm !== 'RESTORE') throw new ValidationError('Type RESTORE to confirm this operation.')
    const result = restore(store, backupId)
    runRecovery(store)
    await auditService.record({ actor, action: 'BACKUP_RESTORED', targetId: backupId, targetType: 'backup', metadata: result })
    return result
  },
}
