-- ============================================================================
-- BeOneOfUs — Subscription lifecycle (Phase 3 / prompt item 4)
-- Auto-downgrade lapsed paid plans to Free, subscription history, cancel flag,
-- and a daily pg_cron job (with a secured API fallback). Idempotent.
-- ============================================================================

-- ── History of every plan change ───────────────────────────────────────────
create table if not exists public.subscription_history (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  from_plan       text,
  to_plan         text,
  action          text not null,   -- upgrade | downgrade | expired | cancelled | reactivated | renewed
  note            text,
  actor_id        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists sub_history_org_idx on public.subscription_history(organization_id, created_at desc);
alter table public.subscription_history enable row level security;
drop policy if exists sub_history_service on public.subscription_history;
drop policy if exists sub_history_read    on public.subscription_history;
create policy sub_history_service on public.subscription_history for all to service_role using (true) with check (true);
create policy sub_history_read on public.subscription_history for select to authenticated
  using (public.is_org_manager(organization_id, auth.uid()));

-- ── Cancellation intent (access retained until period end) ──────────────────
alter table public.org_subscriptions add column if not exists cancel_at_period_end boolean not null default false;

-- ── Lifecycle function: downgrade lapsed plans, log history, expire subs ─────
create or replace function public.run_subscription_lifecycle()
returns integer language plpgsql security definer set search_path = public as $$
declare
  affected integer := 0;
begin
  -- Log the downgrade for every org whose paid plan has lapsed.
  insert into public.subscription_history (organization_id, from_plan, to_plan, action, note)
  select id, plan, 'free', 'expired', 'Auto-downgraded after plan expiry'
  from public.organizations
  where plan is not null and plan <> 'free'
    and plan_expires_at is not null and plan_expires_at < now();

  -- Downgrade them to Free.
  update public.organizations
    set plan = 'free', plan_expires_at = null
    where plan is not null and plan <> 'free'
      and plan_expires_at is not null and plan_expires_at < now();
  get diagnostics affected = row_count;

  -- Expire the underlying subscription rows.
  update public.org_subscriptions
    set status = 'expired', updated_at = now()
    where status = 'active'
      and current_period_end is not null and current_period_end < now();

  return affected;
end;
$$;
revoke execute on function public.run_subscription_lifecycle() from anon, public;
grant execute on function public.run_subscription_lifecycle() to service_role;

-- ── Schedule daily at 03:00 UTC via pg_cron, if the extension is available ───
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin perform cron.unschedule('subscription-lifecycle'); exception when others then null; end;
    perform cron.schedule('subscription-lifecycle', '0 3 * * *', 'select public.run_subscription_lifecycle();');
  end if;
exception when others then
  -- pg_cron not enabled here → use the secured /api/cron/subscriptions endpoint
  -- with an external scheduler (e.g. Vercel Cron) instead.
  null;
end $$;
