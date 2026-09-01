// Throwing wrapper around the shared policy module (shared/policy.ts).
// Services call `authorize(actor, action, resource)` and get a typed 403 on
// denial, plus a DENIED audit event.

import type { SafeUser } from '@shared/types'
import { can } from '@shared/policy'
import type { PolicyAction, PolicyResource } from '@shared/policy'
import { AuthError, TenantError } from './errors'
import { auditService } from '../services/auditService'

export { can }
export type { PolicyAction, PolicyResource }

export async function authorize(
  actor: SafeUser | null,
  action: PolicyAction,
  resource: PolicyResource,
): Promise<void> {
  const decision = can(actor, action, resource)
  if (decision.ok) return
  if (actor) {
    await auditService.record({
      actor,
      action: `POLICY_DENIED:${action}`,
      targetType: resource.kind,
      result: 'DENIED',
      metadata: { reason: decision.reason },
    })
  }
  throw decision.code === 'TENANT_FORBIDDEN'
    ? new TenantError(decision.reason)
    : new AuthError(decision.reason ?? 'Not authorized.', 'bad_credentials')
}
