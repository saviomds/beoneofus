-- ============================================================================
-- BeOneOfUs — Organizational Subscriptions (Revenue model #2)
-- Tiered plans (free / growth / scale) for orgs to post, hire, and engage at
-- scale. Payment via Paystack (same rails as individual Premium). Idempotent.
-- ============================================================================

create table if not exists public.org_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  plan               text not null default 'growth',           -- growth | scale
  status             text not null default 'pending_payment',  -- pending_payment | active | cancelled | expired
  amount             bigint,
  currency           text,
  payment_reference  text unique,
  payment_provider   text,
  current_period_end timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create index if not exists org_subs_org_idx on public.org_subscriptions(organization_id, created_at desc);

alter table public.org_subscriptions enable row level security;
-- All reads/writes go through the service-role billing API (which manager-gates),
-- so lock the table to service_role only — no direct client access.
drop policy if exists org_subs_service on public.org_subscriptions;
create policy org_subs_service on public.org_subscriptions
  for all to service_role using (true) with check (true);

-- Fast entitlement fields on the org itself (organizations is publicly readable,
-- so a plan badge can render without exposing the subscription/payment rows).
alter table public.organizations add column if not exists plan text default 'free';
alter table public.organizations add column if not exists plan_expires_at timestamptz;
