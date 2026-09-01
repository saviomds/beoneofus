import { api } from '@/lib/api'

type A = unknown

export interface SystemHealth {
  status: 'HEALTHY' | 'WARNING' | 'RECOVERY' | 'ERROR'
  lastRecoveryReport: unknown
  integrity: { name: string; ok: boolean; reason?: string }[]
  journal: { entries: number; rolledBack: number; incompleteTransactions: number }
  lastBackup: string | null
  backupCount: number
  activeSessions: number
  dataDir: string
  collections: { name: string; ok: boolean; rows: number }[]
}

export interface BackupManifest {
  id: string
  label: string
  createdAt: string
  counts: Record<string, number>
  fingerprint: string
}

export const systemService = {
  health: (_a: A) => api.get<SystemHealth>('/system/health'),
  recheck: (_a: A) => api.post<{ status: string }>('/system/recheck'),
  backups: (_a: A) => api.get<BackupManifest[]>('/system/backups'),
  createBackup: (_a: A, label = 'manual') => api.post<BackupManifest>('/system/backups', { label }),
  restoreBackup: (_a: A, backupId: string, confirm: string) =>
    api.post<{ safetyBackup: string }>('/system/restore', { backupId, confirm }),
}
