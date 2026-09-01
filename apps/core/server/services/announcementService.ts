import { announcementsRepo, usersRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService, notificationService, recent } from './_shared'
import { NotFoundError } from '../lib/errors'
import type { Announcement, Id, Role, SafeUser, User } from '@shared/types'

function visibleTo(a: Announcement, user: SafeUser): boolean {
  if (a.audience === 'all') return true
  return (a.audience as Role[]).includes(user.role)
}

export const announcementService = {
  async feedFor(actor: SafeUser): Promise<Announcement[]> {
    assertPermission(actor, P.ANNOUNCEMENTS_VIEW)
    const rows = (await announcementsRepo.list()) as Announcement[]
    return rows
      .filter((a) => visibleTo(a, actor))
      .filter((a) => a.scope === 'platform' || a.scope === 'government' || a.organizationId === actor.organizationId || actor.role === 'admin')
      .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1))
  },

  async authored(actor: SafeUser): Promise<Announcement[]> {
    const rows = (await announcementsRepo.list()) as Announcement[]
    return recent(rows.filter((a) => a.authorId === actor.id || (actor.organizationId && a.organizationId === actor.organizationId)))
  },

  async create(
    actor: SafeUser,
    input: Pick<Announcement, 'title' | 'body' | 'priority'> & Partial<Pick<Announcement, 'audience' | 'pinned'>>,
  ): Promise<Announcement> {
    assertPermission(actor, P.ANNOUNCEMENTS_CREATE)
    const scope = actor.role === 'government' ? 'government' : actor.role === 'admin' ? 'platform' : 'school'
    const audience = input.audience ?? (actor.role === 'government' ? (['school'] as Role[]) : 'all')
    const ann = (await announcementsRepo.create({
      authorId: actor.id, organizationId: actor.organizationId, audience, scope,
      title: input.title, body: input.body, priority: input.priority, pinned: input.pinned ?? false,
    }, actor.id)) as Announcement
    await auditService.record({ actor, action: 'ANNOUNCEMENT_PUBLISHED', targetId: ann.id, targetType: 'announcement', organizationId: actor.organizationId })

    const all = ((await usersRepo.list()) as User[]).filter((u) => u.status === 'active')
    const targets = all.filter((u) => {
      if (u.id === actor.id) return false
      const audienceOk = audience === 'all' || (audience as Role[]).includes(u.role)
      if (!audienceOk) return false
      if (scope === 'school') return u.organizationId === actor.organizationId
      return true
    })
    for (const u of targets) {
      await notificationService.create({ recipientId: u.id, type: 'system', title: `Announcement: ${input.title}`, message: input.body.slice(0, 100), actionUrl: `/${u.role === 'mentor' ? 'teacher' : u.role}/notifications`, organizationId: actor.organizationId })
    }
    return ann
  },

  async setPinned(actor: SafeUser, id: Id, pinned: boolean): Promise<Announcement> {
    assertPermission(actor, P.ANNOUNCEMENTS_CREATE)
    const a = (await announcementsRepo.get(id)) as Announcement | null
    if (!a) throw new NotFoundError('Announcement')
    return announcementsRepo.update(id, { pinned }, { actorId: actor.id }) as Promise<Announcement>
  },

  async remove(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.ANNOUNCEMENTS_CREATE)
    await announcementsRepo.remove(id, actor.id)
    await auditService.record({ actor, action: 'ANNOUNCEMENT_REMOVED', targetId: id, targetType: 'announcement', organizationId: actor.organizationId })
  },
}
