-- Prescriptive layer: AI Recommendations Engine for institution consoles.
--
-- Where org_insights answers "what happened", org_recommendations answers "what
-- should you do next" — concrete, ranked, trackable actions per participant type
-- (government: underserved districts; education: employer links / lagging cohorts;
-- healthcare: participation-gap outreach; NGO: volunteer shortages; community:
-- re-engagement events). Each row is a workflow item with an accept/dismiss/done
-- lifecycle, deduped by a stable `signature` so regeneration preserves decisions.
--
-- Idempotent / guarded — reuses program_kind + is_org_manager + touch_updated_at.

do $$ begin
  create type recommendation_status as enum ('suggested','accepted','dismissed','done','expired');
exception when duplicate_object then null; end $$;

create table if not exists public.org_recommendations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  signature         text not null,                 -- stable dedup key: "<type>:<target>"
  type              text not null,                 -- regional_coverage | declining_completion | ...
  priority          text not null default 'medium',-- high | medium | low
  title             text not null,
  rationale         text,
  evidence          jsonb not null default '{}'::jsonb,  -- the real numbers behind it
  suggested_kind    program_kind,                  -- program to create if accepted (optional)
  target_program_id uuid references public.org_programs(id) on delete set null,
  status            recommendation_status not null default 'suggested',
  source            text default 'rules',          -- rules | ai
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  acted_at          timestamptz,
  unique (organization_id, signature)
);

create index if not exists org_recs_org_idx    on public.org_recommendations(organization_id);
create index if not exists org_recs_status_idx on public.org_recommendations(status);

drop trigger if exists org_recs_touch on public.org_recommendations;
create trigger org_recs_touch before update on public.org_recommendations
  for each row execute function public.touch_updated_at();

alter table public.org_recommendations enable row level security;

drop policy if exists org_recs_read   on public.org_recommendations;
drop policy if exists org_recs_write  on public.org_recommendations;
drop policy if exists org_recs_update on public.org_recommendations;
drop policy if exists org_recs_delete on public.org_recommendations;
create policy org_recs_read on public.org_recommendations for select
  using (public.is_org_manager(organization_id, auth.uid()));
create policy org_recs_write on public.org_recommendations for insert to authenticated
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_recs_update on public.org_recommendations for update to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_recs_delete on public.org_recommendations for delete to authenticated
  using (public.is_org_manager(organization_id, auth.uid()));
