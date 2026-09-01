import { campaignsRepo, campaignSubmissionsRepo, organizationsRepo, usersRepo } from '../lib/db'
import { auditService, notificationService } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { authorize } from '../lib/authorize'
import { reference } from '../lib/codes'
import type {
  Campaign, CampaignField, CampaignSubmission, Id, Organization, OrganizationType, SafeUser, User,
} from '@shared/types'

const REVIEW_TYPES: OrganizationType[] = ['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER']

function normField(f: Partial<CampaignField>, i: number): CampaignField {
  const key = (f.key ?? f.label ?? `field_${i + 1}`).toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return {
    key: key || `field_${i + 1}`,
    label: (f.label ?? key).toString(),
    type: (['text', 'number', 'integer', 'boolean', 'select', 'date'].includes(String(f.type)) ? f.type : 'text') as CampaignField['type'],
    required: f.required !== false,
    options: Array.isArray(f.options) ? f.options.map(String) : [],
    help: (f.help ?? '').toString(),
  }
}

async function orgName(id: Id): Promise<string> {
  const o = (await organizationsRepo.get(id)) as Organization | null
  return o?.officialName ?? id
}

async function notifyOrgAdmins(orgId: Id, title: string, message: string, url: string) {
  const admins = ((await usersRepo.list()) as User[]).filter((u) => u.organizationId === orgId && u.role === 'school')
  for (const a of admins) {
    await notificationService.create({ recipientId: a.id, type: 'government', title, message, actionUrl: url, organizationId: orgId })
  }
}

function computeStatus(c: Campaign): Campaign['status'] {
  if (c.status === 'DRAFT' || c.status === 'CLOSED' || c.status === 'ARCHIVED') return c.status
  const now = Date.now()
  if (new Date(c.dueAt).getTime() < now) return 'CLOSED'
  if (new Date(c.dueAt).getTime() - now < 3 * 86400_000) return 'CLOSING_SOON'
  return 'OPEN'
}

export const campaignService = {
  async list(actor: SafeUser): Promise<Campaign[]> {
    const rows = (await campaignsRepo.list()) as Campaign[]
    if (actor.role === 'admin' || actor.role === 'government') {
      return rows.map((c) => ({ ...c, status: computeStatus(c) })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    }
    // institutions see only published campaigns that target them
    return rows
      .filter((c) => c.status !== 'DRAFT' && c.targetOrganizationIds.includes(actor.organizationId ?? '__none__'))
      .map((c) => ({ ...c, status: computeStatus(c) }))
      .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1))
  },

  async get(actor: SafeUser, id: Id): Promise<Campaign> {
    const c = (await campaignsRepo.get(id)) as Campaign | null
    if (!c) throw new NotFoundError('Campaign')
    if (
      actor.role !== 'admin' && actor.role !== 'government' &&
      !(c.status !== 'DRAFT' && c.targetOrganizationIds.includes(actor.organizationId ?? '__none__'))
    ) {
      throw new NotFoundError('Campaign')
    }
    return { ...c, status: computeStatus(c) }
  },

  async create(
    actor: SafeUser,
    input: {
      title: string; description?: string; fields: Partial<CampaignField>[]
      audienceOrganizationTypes?: OrganizationType[]; opensAt?: string; dueAt: string
    },
  ): Promise<Campaign> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    if (!input.title?.trim()) throw new ValidationError('A campaign title is required.')
    if (!input.dueAt) throw new ValidationError('A due date is required.')
    const fields = (input.fields ?? []).map(normField)
    if (!fields.length) throw new ValidationError('Add at least one data field.')
    const keys = new Set<string>()
    for (const f of fields) {
      if (keys.has(f.key)) throw new ValidationError(`Duplicate field key: ${f.key}`)
      keys.add(f.key)
    }

    const id = await reference(campaignsRepo as never, 'CMP')
    const campaign = (await campaignsRepo.create({
      id, reference: id, title: input.title.trim(), description: input.description ?? '',
      createdBy: actor.id, governmentOrganizationId: actor.organizationId ?? null,
      fields, audienceOrganizationTypes: input.audienceOrganizationTypes?.length ? input.audienceOrganizationTypes : REVIEW_TYPES,
      targetOrganizationIds: [], opensAt: input.opensAt || new Date().toISOString(),
      dueAt: new Date(input.dueAt).toISOString(), status: 'DRAFT',
    }, actor.id)) as Campaign
    await auditService.record({ actor, action: 'CAMPAIGN_CREATED', targetId: id, targetType: 'campaign', metadata: { title: campaign.title } })
    return campaign
  },

  async update(actor: SafeUser, id: Id, patch: Partial<{ title: string; description: string; fields: Partial<CampaignField>[]; dueAt: string; audienceOrganizationTypes: OrganizationType[] }>): Promise<Campaign> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    const c = (await campaignsRepo.get(id)) as Campaign | null
    if (!c) throw new NotFoundError('Campaign')
    if (c.status !== 'DRAFT') throw new ValidationError('Only a draft campaign can be edited.')
    const next: Partial<Campaign> = {}
    if (patch.title !== undefined) next.title = patch.title.trim()
    if (patch.description !== undefined) next.description = patch.description
    if (patch.dueAt !== undefined) next.dueAt = new Date(patch.dueAt).toISOString()
    if (patch.audienceOrganizationTypes !== undefined) next.audienceOrganizationTypes = patch.audienceOrganizationTypes
    if (patch.fields !== undefined) next.fields = patch.fields.map(normField)
    return campaignsRepo.update(id, next, { actorId: actor.id }) as Promise<Campaign>
  },

  /** Publish: resolve the audience to concrete institutions and open submissions. */
  async publish(actor: SafeUser, id: Id): Promise<Campaign> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    const c = (await campaignsRepo.get(id)) as Campaign | null
    if (!c) throw new NotFoundError('Campaign')
    if (c.status !== 'DRAFT') throw new ValidationError('This campaign is already published.')

    const orgs = ((await organizationsRepo.list()) as Organization[]).filter(
      (o) => o.status === 'ACTIVE' && c.audienceOrganizationTypes.includes(o.organizationType),
    )
    if (!orgs.length) throw new ValidationError('No active institutions match the selected audience.')

    for (const o of orgs) {
      await campaignSubmissionsRepo.create({
        campaignId: c.id, organizationId: o.id, data: {}, status: 'NOT_STARTED',
        submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reviewNote: '',
      }, actor.id)
      await notifyOrgAdmins(o.id, 'New data campaign', `${c.title} — response due ${c.dueAt.slice(0, 10)}.`, '/school/campaigns')
    }

    const updated = (await campaignsRepo.update(id, {
      status: 'OPEN', targetOrganizationIds: orgs.map((o) => o.id),
    }, { actorId: actor.id })) as Campaign
    await auditService.record({ actor, action: 'CAMPAIGN_PUBLISHED', targetId: id, targetType: 'campaign', metadata: { institutions: orgs.length } })
    return updated
  },

  async close(actor: SafeUser, id: Id): Promise<Campaign> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    const c = (await campaignsRepo.get(id)) as Campaign | null
    if (!c) throw new NotFoundError('Campaign')
    const updated = (await campaignsRepo.update(id, { status: 'CLOSED' }, { actorId: actor.id })) as Campaign
    await auditService.record({ actor, action: 'CAMPAIGN_CLOSED', targetId: id, targetType: 'campaign' })
    return updated
  },

  // --- institution side --------------------------------------------------- --

  async submissionFor(actor: SafeUser, campaignId: Id): Promise<{ campaign: Campaign; submission: CampaignSubmission }> {
    const campaign = await this.get(actor, campaignId)
    const mine = ((await campaignSubmissionsRepo.list({ campaignId })) as CampaignSubmission[]).find(
      (s) => s.organizationId === actor.organizationId,
    )
    if (!mine) throw new NotFoundError('Your institution was not included in this campaign')
    await authorize(actor, 'RESPOND_GOVERNMENT_CAMPAIGN', { kind: 'campaignSubmission', organizationId: mine.organizationId })
    return { campaign, submission: mine }
  },

  async saveSubmission(actor: SafeUser, campaignId: Id, data: Record<string, unknown>): Promise<CampaignSubmission> {
    const { campaign, submission } = await this.submissionFor(actor, campaignId)
    if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(submission.status)) {
      throw new ValidationError('This submission has already been sent.')
    }
    if (computeStatus(campaign) === 'CLOSED') throw new ValidationError('This campaign is closed.')
    return campaignSubmissionsRepo.update(submission.id, {
      data: sanitizeData(campaign.fields, data), status: 'IN_PROGRESS',
    }, { actorId: actor.id }) as Promise<CampaignSubmission>
  },

  async submit(actor: SafeUser, campaignId: Id): Promise<CampaignSubmission> {
    const { campaign, submission } = await this.submissionFor(actor, campaignId)
    if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(submission.status)) return submission
    if (computeStatus(campaign) === 'CLOSED') throw new ValidationError('This campaign is closed.')

    const missing = campaign.fields.filter((f) => f.required && isBlank(submission.data[f.key]))
    if (missing.length) throw new ValidationError(`Complete all required fields: ${missing.map((f) => f.label).join(', ')}`)

    const updated = (await campaignSubmissionsRepo.update(submission.id, {
      status: 'SUBMITTED', submittedBy: actor.id, submittedAt: new Date().toISOString(),
    }, { actorId: actor.id })) as CampaignSubmission
    await auditService.record({ actor, action: 'CAMPAIGN_SUBMITTED', targetId: submission.id, targetType: 'campaignSubmission', organizationId: submission.organizationId, metadata: { campaignId } })

    const gov = (await usersRepo.get(campaign.createdBy)) as User | null
    if (gov) await notificationService.create({ recipientId: gov.id, type: 'government', title: 'Campaign response submitted', message: `${await orgName(submission.organizationId)} responded to ${campaign.title}.`, actionUrl: '/government/campaigns' })
    return updated
  },

  // --- government review ------------------------------------------------- ---

  async submissions(actor: SafeUser, campaignId: Id): Promise<(CampaignSubmission & { organizationName: string })[]> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    await this.get(actor, campaignId)
    const rows = (await campaignSubmissionsRepo.list({ campaignId })) as CampaignSubmission[]
    return Promise.all(rows.map(async (s) => ({ ...s, organizationName: await orgName(s.organizationId) })))
  },

  async reviewSubmission(actor: SafeUser, submissionId: Id, decision: 'approve' | 'return', note = ''): Promise<CampaignSubmission> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    const s = (await campaignSubmissionsRepo.get(submissionId)) as CampaignSubmission | null
    if (!s) throw new NotFoundError('Submission')
    if (s.status !== 'SUBMITTED' && s.status !== 'UNDER_REVIEW') throw new ValidationError('This submission is not awaiting review.')
    const status: CampaignSubmission['status'] = decision === 'approve' ? 'APPROVED' : 'RETURNED'
    const updated = (await campaignSubmissionsRepo.update(submissionId, {
      status, reviewedBy: actor.id, reviewedAt: new Date().toISOString(), reviewNote: note,
    }, { actorId: actor.id })) as CampaignSubmission
    await auditService.record({ actor, action: `CAMPAIGN_SUBMISSION_${status}`, targetId: submissionId, targetType: 'campaignSubmission', organizationId: s.organizationId, metadata: { note } })
    await notifyOrgAdmins(s.organizationId, `Campaign response ${status.toLowerCase()}`, note || `Your submission was ${status.toLowerCase()}.`, '/school/campaigns')
    return updated
  },

  async dashboard(actor: SafeUser, campaignId: Id): Promise<{
    campaign: Campaign
    totals: Record<CampaignSubmission['status'], number>
    assigned: number
    completionPct: number
    overdue: number
  }> {
    await authorize(actor, 'MANAGE_GOVERNMENT_CAMPAIGN', { kind: 'campaign' })
    const campaign = await this.get(actor, campaignId)
    const rows = (await campaignSubmissionsRepo.list({ campaignId })) as CampaignSubmission[]
    const totals = { NOT_STARTED: 0, IN_PROGRESS: 0, SUBMITTED: 0, UNDER_REVIEW: 0, RETURNED: 0, APPROVED: 0 } as Record<CampaignSubmission['status'], number>
    for (const r of rows) totals[r.status] += 1
    const done = totals.SUBMITTED + totals.UNDER_REVIEW + totals.APPROVED
    const past = new Date(campaign.dueAt).getTime() < Date.now()
    return {
      campaign,
      totals,
      assigned: rows.length,
      completionPct: rows.length ? Math.round((done / rows.length) * 100) : 0,
      overdue: past ? totals.NOT_STARTED + totals.IN_PROGRESS + totals.RETURNED : 0,
    }
  },
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))
}

function sanitizeData(fields: CampaignField[], data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const raw = data[f.key]
    if (raw === undefined) continue
    if (f.type === 'number' || f.type === 'integer') {
      const n = Number(raw)
      out[f.key] = Number.isFinite(n) ? (f.type === 'integer' ? Math.trunc(n) : n) : null
    } else if (f.type === 'boolean') {
      out[f.key] = raw === true || raw === 'true' || raw === 'yes'
    } else {
      out[f.key] = String(raw)
    }
  }
  return out
}
