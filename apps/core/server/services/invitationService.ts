import { invitationsRepo, organizationsRepo, usersRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, auditService, notificationService, recent } from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { sha256, randomToken } from '../lib/password'
import { hashPassword } from '../lib/password'
import { orgCode, reference } from '../lib/codes'
import type {
  EducationStructureKey, Id, Invitation, Organization, OrganizationType, SafeUser, User,
} from '@shared/types'

const INVITE_TTL_DAYS = 14

/** What the public /register page is allowed to see about an invitation. */
export interface PublicInvitation {
  id: Id
  organizationName: string
  organizationType: OrganizationType
  institutionLevels: EducationStructureKey[]
  recipientName: string
  recipientEmail: string
  expiresAt: string
  status: Invitation['status']
}

function toPublic(inv: Invitation): PublicInvitation {
  return {
    id: inv.id, organizationName: inv.organizationName, organizationType: inv.organizationType,
    institutionLevels: inv.institutionLevels, recipientName: inv.recipientName,
    recipientEmail: inv.recipientEmail, expiresAt: inv.expiresAt, status: inv.status,
  }
}

export const invitationService = {
  async list(actor: SafeUser): Promise<Invitation[]> {
    assertPermission(actor, P.INVITATION_CREATE)
    const rows = (await invitationsRepo.list()) as Invitation[]
    const scoped = actor.role === 'admin' ? rows : rows.filter((i) => i.issuedBy === actor.id)
    return recent(scoped)
  },

  /** Issue an invitation. Returns the raw token ONCE (never stored). */
  async create(
    actor: SafeUser,
    input: {
      organizationName: string; organizationType: OrganizationType
      institutionLevels: EducationStructureKey[]; recipientName: string; recipientEmail: string
    },
  ): Promise<{ invitation: Invitation; token: string; link: string }> {
    assertPermission(actor, P.INVITATION_CREATE)
    if (!input.organizationName?.trim()) throw new ValidationError('Institution name is required.')
    const token = randomToken(24)
    const ref = await reference(invitationsRepo as never, 'INV')
    const invitation = (await invitationsRepo.create({
      id: ref, tokenHash: sha256(token), organizationName: input.organizationName,
      organizationType: input.organizationType, institutionLevels: input.institutionLevels,
      recipientEmail: input.recipientEmail, recipientName: input.recipientName,
      issuedBy: actor.id, issuedByType: actor.role === 'government' ? 'GOVERNMENT' : 'ADMIN',
      permissions: ['institution.create', 'institution.manage'],
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString(),
      status: 'PENDING', acceptedAt: null, organizationId: null,
    }, actor.id)) as Invitation
    await auditService.record({ actor, action: 'INVITATION_ISSUED', targetId: invitation.id, targetType: 'invitation', metadata: { org: input.organizationName } })
    return { invitation, token, link: `/register/institution?token=${token}` }
  },

  async revoke(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.INVITATION_REVOKE)
    const inv = (await invitationsRepo.get(id)) as Invitation | null
    if (!inv) throw new NotFoundError('Invitation')
    await invitationsRepo.update(id, { status: 'REVOKED' }, { actorId: actor.id })
    await auditService.record({ actor, action: 'INVITATION_REVOKED', targetId: id, targetType: 'invitation' })
  },

  /** Public — look up an invitation by its raw token. */
  async getByToken(token: string): Promise<PublicInvitation | null> {
    if (!token) return null
    const hash = sha256(token)
    const inv = ((await invitationsRepo.list()) as Invitation[]).find((i) => i.tokenHash === hash)
    if (!inv) return null
    if (inv.status === 'PENDING' && new Date(inv.expiresAt).getTime() < Date.now()) {
      await invitationsRepo.update(inv.id, { status: 'EXPIRED' }, { actorId: 'system' })
      return toPublic({ ...inv, status: 'EXPIRED' })
    }
    return toPublic(inv)
  },

  /**
   * Public — the authorized representative accepts, setting a password. Creates
   * the Organization (PENDING) + its institution-admin User, marks the invite
   * ACCEPTED (single-use), audits. The org still needs admin approval to go ACTIVE.
   */
  async accept(
    token: string,
    input: {
      password: string; representativeName: string; representativePhone?: string
      registrationNumber?: string; country?: string; province?: string; district?: string; city?: string
      address?: string; phone?: string; email?: string; website?: string; shortName?: string; headName?: string
    },
  ): Promise<{ organization: Organization; adminCode: string }> {
    if (!input.password || input.password.length < 6) throw new ValidationError('Choose a password of at least 6 characters.')
    const hash = sha256(token)
    const inv = ((await invitationsRepo.list()) as Invitation[]).find((i) => i.tokenHash === hash)
    if (!inv) throw new NotFoundError('Invitation')
    if (inv.status !== 'PENDING') throw new ValidationError(`This invitation is ${inv.status.toLowerCase()} and can no longer be used.`)
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      await invitationsRepo.update(inv.id, { status: 'EXPIRED' }, { actorId: 'system' })
      throw new ValidationError('This invitation has expired.')
    }

    const id = await orgCode(organizationsRepo as never, inv.organizationType, input.country === 'Rwanda' || !input.country ? 'RW' : 'XX')
    const organization = (await organizationsRepo.create({
      id, organizationCode: id, organizationType: inv.organizationType, institutionLevels: inv.institutionLevels,
      officialName: inv.organizationName, shortName: input.shortName ?? inv.organizationName.split(' ').map((w) => w[0]).join('').toUpperCase(),
      registrationNumber: input.registrationNumber ?? '', country: input.country ?? 'Rwanda',
      province: input.province ?? '', district: input.district ?? '', city: input.city ?? '',
      address: input.address ?? '', phone: input.phone ?? '', email: input.email ?? inv.recipientEmail,
      website: input.website ?? '', logo: null, headName: input.headName ?? input.representativeName, headTitle: 'Head of Institution',
      status: 'PENDING', authorizedBy: inv.issuedBy,
    }, 'system')) as Organization

    const adminCode = `BOU-ORG-RW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`
    const pw = hashPassword(input.password)
    await usersRepo.create({
      code: adminCode, passwordHash: pw.hash, passwordSalt: pw.salt, role: 'school', organizationRole: 'admin',
      status: 'active', name: input.representativeName, email: input.email ?? inv.recipientEmail,
      phone: input.representativePhone ?? '', avatar: null, lastLogin: null, failedLogins: 0, lockedUntil: null,
      permissions: [], organizationId: organization.id, govScope: null,
    }, 'system')

    await invitationsRepo.update(inv.id, { status: 'ACCEPTED', acceptedAt: new Date().toISOString(), organizationId: organization.id }, { actorId: 'system' })
    await auditService.record({ actor: { id: 'system', role: 'system' }, action: 'INVITATION_ACCEPTED', targetId: organization.id, targetType: 'organization', organizationId: organization.id, metadata: { invitation: inv.id } })

    // Notify the issuer that an org is awaiting approval.
    const issuer = (await usersRepo.get(inv.issuedBy)) as User | null
    if (issuer) {
      await notificationService.create({ recipientId: issuer.id, type: 'onboarding', title: 'Institution awaiting approval', message: `${organization.officialName} has completed registration.`, actionUrl: '/admin/organizations' })
    }
    return { organization, adminCode }
  },
}
