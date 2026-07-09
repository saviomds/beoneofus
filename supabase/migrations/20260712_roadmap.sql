-- ============================================================================
-- BeOneOfUs — Roadmap phase tracking
-- Live status/progress overlay for the public roadmap. The canonical content
-- (titles, features, KPIs) lives in src/lib/roadmapData.js; this table only
-- tracks the mutable execution state so admins can update it without a deploy.
-- Idempotent.
-- ============================================================================

create table if not exists public.roadmap_phases (
  id          text primary key,                     -- matches roadmapData.js phase id
  number      integer not null,
  status      text not null default 'planned',      -- planned | in_progress | completed
  progress    integer not null default 0 check (progress between 0 and 100),
  timeline    text,
  note        text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz default now()
);

alter table public.roadmap_phases enable row level security;

-- Public can read execution state (it's an investor-facing page).
drop policy if exists roadmap_public_read on public.roadmap_phases;
create policy roadmap_public_read on public.roadmap_phases
  for select to anon, authenticated using (true);

-- Only the service role (via the admin-gated API) may write.
drop policy if exists roadmap_service_write on public.roadmap_phases;
create policy roadmap_service_write on public.roadmap_phases
  for all to service_role using (true) with check (true);

-- Seed current execution state (safe to re-run; won't clobber later edits).
insert into public.roadmap_phases (id, number, status, progress, timeline) values
  ('foundation',   1, 'completed',   100, 'Q1 – Q2 2026'),
  ('institutional',2, 'in_progress',  62, 'Q3 – Q4 2026'),
  ('ecosystem',    3, 'planned',      12, '2027'),
  ('intelligence', 4, 'planned',       0, '2028 →')
on conflict (id) do nothing;
