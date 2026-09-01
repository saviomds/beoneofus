import { settingsRepo } from '../lib/db'
import { auditService } from './_shared'
import type { SafeUser, SettingsRecord } from '@shared/types'

const DEFAULTS: Record<SettingsRecord['scope'], Record<string, unknown>> = {
  user: { emailUpdates: true, sessionReminders: true, compactMode: false, publicProfile: true, theme: 'system' },
  school: { academicYear: String(new Date().getFullYear()), gradingScale: 'A–F (100 pt)', attendanceThreshold: 75, autoApproveReports: false, theme: 'system' },
  government: { notifyOnNewRequest: true, theme: 'system' },
  platform: { maintenanceMode: false, allowRegistration: false, sessionTimeoutMinutes: 480, theme: 'system' },
}

function scopeFor(actor: SafeUser): SettingsRecord['scope'] {
  if (actor.role === 'school') return 'school'
  if (actor.role === 'government') return 'government'
  if (actor.role === 'admin') return 'platform'
  return 'user'
}

export const settingsService = {
  async forActor(actor: SafeUser): Promise<SettingsRecord> {
    const scope = scopeFor(actor)
    const ownerKey = scope === 'user' ? actor.id : actor.organizationId ?? actor.id
    const rows = (await settingsRepo.list()) as SettingsRecord[]
    const found = rows.find((r) => r.ownerId === actor.id || r.id === ownerKey)
    if (found) return { ...found, values: { ...DEFAULTS[scope], ...found.values } }
    return { id: ownerKey, ownerId: actor.id, organizationId: actor.organizationId, scope, values: { ...DEFAULTS[scope] }, version: 1, updatedAt: new Date().toISOString() }
  },

  async save(actor: SafeUser, values: Record<string, unknown>): Promise<SettingsRecord> {
    const current = await this.forActor(actor)
    const merged = { ...current.values, ...values }
    const exists = ((await settingsRepo.list()) as SettingsRecord[]).some((r) => r.id === current.id)
    const saved = exists
      ? ((await settingsRepo.update(current.id, { values: merged, updatedAt: new Date().toISOString() }, { actorId: actor.id })) as SettingsRecord)
      : ((await settingsRepo.create({ id: current.id, ownerId: actor.id, organizationId: actor.organizationId, scope: current.scope, values: merged, updatedAt: new Date().toISOString() }, actor.id)) as SettingsRecord)
    await auditService.record({ actor, action: 'SETTINGS_UPDATED', targetId: current.id, targetType: 'settings', organizationId: actor.organizationId, metadata: { keys: Object.keys(values) } })
    return saved
  },
}
