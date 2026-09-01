// ---------------------------------------------------------------------------
// Centralised authorization policy.
//
//   can(actor, action, resource) -> { ok, reason? }
//
// This is the ONE place that maps a semantic action onto (a) the permission it
// needs and (b) the tenant relationship it requires. Route handlers and
// services call `can` / `authorize` instead of re-deriving ad-hoc checks.
//
// Cross-institution READ access via an explicit RecordShareGrant is resolved
// server-side (it needs an async grant lookup) — see server/lib/authorize.ts,
// which wraps this module.
// ---------------------------------------------------------------------------

import type { Permission, SafeUser } from './types'
import { PERMISSIONS as P, hasPermission } from './rbac'

export type PolicyAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'TRANSFER'
  | 'EXPORT'
  | 'VERIFY'
  | 'REQUEST_RECORDS'
  | 'APPROVE_RECORD_REQUEST'
  | 'MANAGE_CONSENT'
  | 'ISSUE_CREDENTIAL'
  | 'REVOKE_CREDENTIAL'
  | 'MANAGE_USERS'
  | 'MANAGE_SCHOOL'
  | 'MANAGE_GOVERNMENT_CAMPAIGN'
  | 'RESPOND_GOVERNMENT_CAMPAIGN'

/** A resource is anything with (optionally) an owning organization. */
export interface PolicyResource {
  kind: string
  organizationId?: string | null
  /** for cross-institution resources, the two parties involved */
  sourceOrganizationId?: string | null
  recipientOrganizationId?: string | null
}

export interface PolicyDecision {
  ok: boolean
  reason?: string
  code?: 'FORBIDDEN' | 'TENANT_FORBIDDEN'
}

const ALLOW: PolicyDecision = { ok: true }
const deny = (reason: string, code: PolicyDecision['code'] = 'FORBIDDEN'): PolicyDecision => ({ ok: false, reason, code })

/** The permission an action requires (null = no extra permission beyond auth). */
const ACTION_PERMISSION: Partial<Record<PolicyAction, Permission>> = {
  REQUEST_RECORDS: P.RECORDS_REQUEST,
  APPROVE_RECORD_REQUEST: P.RECORDS_SHARE,
  MANAGE_CONSENT: P.CONSENT_MANAGE,
  ISSUE_CREDENTIAL: P.CREDENTIALS_ISSUE,
  REVOKE_CREDENTIAL: P.CREDENTIALS_REVOKE,
  MANAGE_USERS: P.USERS_MANAGE,
  MANAGE_GOVERNMENT_CAMPAIGN: P.CAMPAIGN_MANAGE,
  RESPOND_GOVERNMENT_CAMPAIGN: P.CAMPAIGN_RESPOND,
  TRANSFER: P.TRANSFER_INITIATE,
}

function sameTenant(actor: SafeUser, orgId: string | null | undefined): boolean {
  if (actor.role === 'admin') return true
  return !!orgId && actor.organizationId === orgId
}

/**
 * Synchronous policy check. Returns a decision rather than throwing so callers
 * can log a DENIED audit event. `authorize()` throws for the common case.
 */
export function can(actor: SafeUser | null, action: PolicyAction, resource: PolicyResource): PolicyDecision {
  if (!actor) return deny('Not signed in.')
  if (actor.role === 'admin') return ALLOW

  const needed = ACTION_PERMISSION[action]
  if (needed && !hasPermission(actor, needed)) return deny(`${needed} is required for this action.`)

  switch (action) {
    // Cross-institution: the actor must be one of the two parties.
    case 'APPROVE_RECORD_REQUEST':
    case 'MANAGE_CONSENT':
      if (resource.sourceOrganizationId && actor.organizationId === resource.sourceOrganizationId) return ALLOW
      return deny('Only the institution that holds the records may act on this request.', 'TENANT_FORBIDDEN')

    case 'REQUEST_RECORDS':
      if (resource.recipientOrganizationId && actor.organizationId !== resource.recipientOrganizationId) {
        return deny('You can only raise record requests for your own institution.', 'TENANT_FORBIDDEN')
      }
      return ALLOW

    case 'RESPOND_GOVERNMENT_CAMPAIGN':
      if (resource.organizationId && !sameTenant(actor, resource.organizationId)) {
        return deny('This submission belongs to another institution.', 'TENANT_FORBIDDEN')
      }
      return ALLOW

    case 'MANAGE_GOVERNMENT_CAMPAIGN':
      if (actor.role !== 'government') return deny('Only a government account may manage campaigns.')
      return ALLOW

    case 'VERIFY':
      return ALLOW // credential verification is public

    default:
      // Ordinary tenant-owned resource: must be in the actor's organization.
      if (resource.organizationId !== undefined && !sameTenant(actor, resource.organizationId)) {
        return deny('This resource belongs to a different organization.', 'TENANT_FORBIDDEN')
      }
      return ALLOW
  }
}
