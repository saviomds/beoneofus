-- ============================================================================
-- BeOneOfUs — Subscription plans (configurable limits) + payment ledger.
-- The single source of truth for plan limits: application code NEVER hardcodes
-- them, it reads from subscription_plans via src/lib/planLimits.js.
-- Idempotent. (Supabase raw-SQL migration — this project uses Supabase, not Drizzle.)
-- ============================================================================

-- ── Plans + configurable limits (NULL limit = unlimited) ────────────────────
create table if not exists public.subscription_plans (
  id                text primary key,            -- free | growth | scale | enterprise
  name              text not null,
  price_usd         numeric,                     -- NULL = custom / contact sales
  billing_period    text not null default 'month',
  active            boolean not null default true,
  sort              int not null default 0,
  active_job_limit  int,
  team_limit        int,
  ai_requests       int,
  storage_limit_mb  int,
  featured_jobs     int,
  recruiter_limit   int,
  campaign_limit    int,
  branding_enabled  boolean not null default false,
  analytics_enabled boolean not null default false,
  api_enabled       boolean not null default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.subscription_plans enable row level security;
-- Plans are public pricing/limits (no secrets) → readable by anyone; writes are
-- service-role only (admin plan management goes through a service-role API).
drop policy if exists subscription_plans_read on public.subscription_plans;
drop policy if exists subscription_plans_write on public.subscription_plans;
create policy subscription_plans_read  on public.subscription_plans for select using (true);
create policy subscription_plans_write on public.subscription_plans for all to service_role using (true) with check (true);

-- Seed defaults (only if a plan row is absent — never clobbers admin edits).
insert into public.subscription_plans
  (id, name, price_usd, sort, active_job_limit, team_limit, ai_requests, storage_limit_mb, featured_jobs, recruiter_limit, campaign_limit, branding_enabled, analytics_enabled, api_enabled)
values
  ('free',       'Starter',    0,    0, 3,    2,   20,    100,   0,   1,   1,    false, false, false),
  ('growth',     'Growth',     49,   1, null, 10,  500,   2000,  3,   5,   10,   true,  true,  false),
  ('scale',      'Scale',      199,  2, null, 50,  5000,  20000, 20,  25,  null, true,  true,  true),
  ('enterprise', 'Enterprise', null, 3, null, null, null, null,  null, null, null, true,  true,  true)
on conflict (id) do nothing;

-- ── Payment ledger: every transaction, never trust client-side success ──────
create table if not exists public.payment_transactions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  user_id          uuid references public.profiles(id) on delete set null,
  reference        text not null unique,        -- provider reference (idempotency key)
  provider         text not null default 'paystack',
  purpose          text,                        -- org_subscription | premium | service | marketplace
  plan_id          text,
  amount           bigint,                      -- smallest currency unit
  currency         text,
  status           text not null default 'pending', -- pending | success | failed | cancelled | expired
  raw              jsonb,                       -- provider payload, for audit/reconciliation
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists payment_tx_org_idx  on public.payment_transactions(organization_id, created_at desc);
create index if not exists payment_tx_ref_idx  on public.payment_transactions(reference);
create index if not exists payment_tx_stat_idx on public.payment_transactions(status);

alter table public.payment_transactions enable row level security;
-- Sensitive → service-role only. No direct client access.
drop policy if exists payment_tx_service on public.payment_transactions;
create policy payment_tx_service on public.payment_transactions for all to service_role using (true) with check (true);
