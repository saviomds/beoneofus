-- ============================================================================
-- Platform narrowing + hiring moderation + partnership display
-- ============================================================================
-- Part A retires the Career workspace (Resume Builder, Career Pathways, Matches)
-- and the pathway-based Leaderboard — code + data.
-- Part B adds an admin approval gate to company profiles and job posts.
-- Part C adds logo/website columns to partnerships so accepted partners can be
-- shown on the marketing home page.
--
-- Part A is DESTRUCTIVE and IRREVERSIBLE. Take a backup first and confirm the
-- table/column names against the live schema (`supabase db diff` / MCP
-- `list_tables`) — `pathways` / `user_pathways` / `job_matches` originate from
-- 20260620_core_tables.sql and 20260624_talent_ecosystem.sql; `profiles.resume_data`
-- was added ad-hoc on the hosted project.
-- ============================================================================

begin;

-- ── Part A — retire Career + Leaderboard data ───────────────────────────────
drop table if exists public.user_pathways cascade;
drop table if exists public.pathways      cascade;
drop table if exists public.job_matches   cascade;
alter table public.profiles drop column if exists resume_data;

-- ── Part B — hiring moderation flags ────────────────────────────────────────
-- New rows default to false (hidden from the public directory until an admin
-- approves). Existing rows are grandfathered so nothing disappears on deploy.
alter table public.companies add column if not exists approved boolean not null default false;
update public.companies set approved = true;

alter table public.jobs add column if not exists approved boolean not null default false;
update public.jobs set approved = true where status = 'active';

-- ── Part C — partnership logo + website ─────────────────────────────────────
alter table public.partnerships add column if not exists logo_url text;
alter table public.partnerships add column if not exists website  text;

-- Allow platform admins / founders to update a partnership's status from the
-- dashboard (the client uses the anon key, so RLS must permit it). Safe to
-- re-run.
drop policy if exists "admins update partnerships" on public.partnerships;
create policy "admins update partnerships"
  on public.partnerships
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.role in ('admin', 'founder'))
    )
  )
  with check (true);

commit;
