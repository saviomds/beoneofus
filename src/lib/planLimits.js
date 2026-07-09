import { createClient } from '@supabase/supabase-js';

/**
 * Centralized subscription-limit service.
 *
 * The ONLY place that knows plan limits. Every module reads limits from here,
 * which reads them from the `subscription_plans` table — application code must
 * never hardcode a limit. A tiny in-process cache avoids per-request DB hits.
 *
 * A FALLBACK mirror of the seeded defaults keeps the platform working if the
 * migration hasn't been applied yet (the table read fails → we use FALLBACK),
 * so limits fail OPEN to the free-tier defaults rather than crashing.
 */

const FALLBACK = {
  free:       { id: 'free',       name: 'Starter',    price_usd: 0,    active_job_limit: 3,    team_limit: 2,    ai_requests: 20,   storage_limit_mb: 100,   featured_jobs: 0,    recruiter_limit: 1,    campaign_limit: 1,    branding_enabled: false, analytics_enabled: false, api_enabled: false },
  growth:     { id: 'growth',     name: 'Growth',     price_usd: 49,   active_job_limit: null, team_limit: 10,   ai_requests: 500,  storage_limit_mb: 2000,  featured_jobs: 3,    recruiter_limit: 5,    campaign_limit: 10,   branding_enabled: true,  analytics_enabled: true,  api_enabled: false },
  scale:      { id: 'scale',      name: 'Scale',      price_usd: 199,  active_job_limit: null, team_limit: 50,   ai_requests: 5000, storage_limit_mb: 20000, featured_jobs: 20,   recruiter_limit: 25,   campaign_limit: null, branding_enabled: true,  analytics_enabled: true,  api_enabled: true  },
  enterprise: { id: 'enterprise', name: 'Enterprise', price_usd: null, active_job_limit: null, team_limit: null, ai_requests: null, storage_limit_mb: null,  featured_jobs: null, recruiter_limit: null, campaign_limit: null, branding_enabled: true,  analytics_enabled: true,  api_enabled: true  },
};

let _cache = null;
let _cacheAt = 0;
const TTL = 60_000; // 60s

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** All plans as a map keyed by id. Cached; falls back to seeded defaults. */
export async function getAllPlans() {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL) return _cache;
  try {
    const { data, error } = await admin().from('subscription_plans').select('*').eq('active', true);
    if (error) throw error;
    if (data && data.length) {
      _cache = Object.fromEntries(data.map((p) => [p.id, p]));
      _cacheAt = now;
      return _cache;
    }
  } catch {
    /* table not present yet, or transient error → fall back */
  }
  return { ...FALLBACK };
}

/** Invalidate the cache (call after an admin edits a plan). */
export function invalidatePlanCache() { _cache = null; _cacheAt = 0; }

/** A single plan by id (defaults to the free plan when unknown). */
export async function getPlan(planId) {
  const plans = await getAllPlans();
  return plans[planId] || plans.free || FALLBACK.free;
}

/** A single limit value for a plan. Returns null for "unlimited". */
export async function getLimit(planId, key) {
  const plan = await getPlan(planId);
  return key in plan ? plan[key] : null;
}

/**
 * Resolve an organization's EFFECTIVE plan id, honouring expiry:
 * a paid plan that has lapsed (plan_expires_at in the past) reverts to 'free'.
 */
export function effectivePlanId(org) {
  const paidTiers = ['growth', 'scale', 'enterprise'];
  if (org && paidTiers.includes(org.plan) && (!org.plan_expires_at || new Date(org.plan_expires_at) > new Date())) {
    return org.plan;
  }
  return 'free';
}
