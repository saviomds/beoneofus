import { getPlan, effectivePlanId } from './planLimits';

/**
 * Centralized organization permission service.
 *
 * Every endpoint asks this service "may this org do X?" instead of re-deriving
 * plan rules inline. All answers ultimately come from `subscription_plans`
 * (via planLimits) — so limits stay configurable in the DB, never hardcoded.
 *
 * Each check returns { allowed: boolean, reason?, limit?, plan } so callers can
 * return a consistent 403 body.
 *
 * `org` is expected to carry { plan, plan_expires_at } (columns on organizations).
 */

async function withPlan(org) {
  const planId = effectivePlanId(org);
  const plan = await getPlan(planId);
  return { planId, plan };
}

function underLimit(count, limit) {
  return limit == null || count < limit; // null limit = unlimited
}

/** Can the org publish another active job? `activeCount` = current non-closed jobs. */
export async function canCreateJob(org, activeCount) {
  const { plan } = await withPlan(org);
  const limit = plan.active_job_limit;
  if (underLimit(activeCount, limit)) return { allowed: true, plan };
  return { allowed: false, plan, limit, reason: `Your ${plan.name} plan allows up to ${limit} active postings. Upgrade to post more.` };
}

/** Can the org feature a job? `featuredCount` = current featured jobs. */
export async function canFeatureJob(org, featuredCount) {
  const { plan } = await withPlan(org);
  const limit = plan.featured_jobs;
  if (underLimit(featuredCount, limit)) return { allowed: true, plan };
  return { allowed: false, plan, limit, reason: `Your ${plan.name} plan includes ${limit || 0} featured postings.` };
}

/** Can the org invite another member? `teamCount` = current members. */
export async function canInviteMember(org, teamCount) {
  const { plan } = await withPlan(org);
  const limit = plan.team_limit;
  if (underLimit(teamCount, limit)) return { allowed: true, plan };
  return { allowed: false, plan, limit, reason: `Your ${plan.name} plan allows up to ${limit} team members.` };
}

/** Can the org create another campaign/program? `campaignCount` = current. */
export async function canCreateCampaign(org, campaignCount) {
  const { plan } = await withPlan(org);
  const limit = plan.campaign_limit;
  if (underLimit(campaignCount, limit)) return { allowed: true, plan };
  return { allowed: false, plan, limit, reason: `Your ${plan.name} plan allows up to ${limit} active campaigns.` };
}

/** Does the plan permit an AI request? `used` = requests already made this period. */
export async function canUseAI(org, used = 0) {
  const { plan } = await withPlan(org);
  const limit = plan.ai_requests;
  if (underLimit(used, limit)) return { allowed: true, plan, remaining: limit == null ? null : Math.max(0, limit - used) };
  return { allowed: false, plan, limit, reason: `Your ${plan.name} plan's AI quota (${limit}) is used up for this period.` };
}

/** Boolean feature gates. */
export async function canAccessAnalytics(org) {
  const { plan } = await withPlan(org);
  return { allowed: !!plan.analytics_enabled, plan, reason: plan.analytics_enabled ? undefined : `Analytics is available on paid plans.` };
}

export async function canUseApi(org) {
  const { plan } = await withPlan(org);
  return { allowed: !!plan.api_enabled, plan, reason: plan.api_enabled ? undefined : `API access is available on the Scale and Enterprise plans.` };
}

export async function canUseBranding(org) {
  const { plan } = await withPlan(org);
  return { allowed: !!plan.branding_enabled, plan, reason: plan.branding_enabled ? undefined : `Custom branding is available on paid plans.` };
}
