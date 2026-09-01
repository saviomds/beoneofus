-- AI insight cache for institution consoles.
--
-- One row per organization holds the most recent AI analysis of its programs,
-- plus a metric SNAPSHOT taken at generation time. The snapshot is the trend
-- baseline: the next generation diffs current metrics against it ("completion
-- up 7 pts since last analysis"). Caching means the Impact tab loads instantly
-- and we only spend an AI call when data has meaningfully changed or 24h passed.
--
-- Idempotent / guarded — safe to re-run. Reuses is_org_manager + touch_updated_at
-- from 20260703_organizations_model.

create table if not exists public.org_insights (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  headline        text,
  insights        jsonb not null default '[]'::jsonb,   -- [{text, kind}]
  trends          jsonb not null default '[]'::jsonb,   -- [{label, direction, delta, text}] (server-computed)
  recommendations jsonb not null default '[]'::jsonb,   -- [{action, rationale}]
  snapshot        jsonb not null default '{}'::jsonb,    -- metric snapshot = trend baseline
  participant_count integer default 0,                   -- fast staleness check
  program_count     integer default 0,
  provider        text,
  model           text,
  unverified_count integer default 0,                    -- AI numbers dropped by the numeric guard
  generated_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists org_insights_touch on public.org_insights;
create trigger org_insights_touch before update on public.org_insights
  for each row execute function public.touch_updated_at();

alter table public.org_insights enable row level security;

-- Managers of the org may read the cache directly (the API also serves it via
-- service role). Writes go through the service-role API only, but we scope the
-- authenticated policies to managers for defense in depth.
drop policy if exists org_insights_read   on public.org_insights;
drop policy if exists org_insights_write  on public.org_insights;
drop policy if exists org_insights_update on public.org_insights;
create policy org_insights_read on public.org_insights for select
  using (public.is_org_manager(organization_id, auth.uid()));
create policy org_insights_write on public.org_insights for insert to authenticated
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_insights_update on public.org_insights for update to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));
