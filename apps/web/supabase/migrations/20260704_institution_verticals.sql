-- Institution verticals backbone — dedicated experiences for the 8 participant
-- types (government, education, healthcare, NGO, community) instead of every
-- institution sharing the hiring-centric business console.
--
-- The primitive is deliberately generic: an "org program" is any initiative an
-- institution runs — a civic scheme, a learning cohort, an access program, a
-- campaign, a community space or event. Each vertical LABELS and MEASURES it
-- differently (see src/lib/orgVerticals.js); the storage is shared so the graph
-- stays queryable across every institution type.
--
-- Idempotent / guarded — safe to re-run. Apply via Supabase MCP or CLI.

-- ── Program kind + lifecycle enums ──────────────────────────────────────────
do $$ begin
  create type program_kind as enum (
    'program','cohort','course','campaign','event','space','service',
    'scheme','scholarship','drive','clinic'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type program_status as enum ('draft','active','completed','archived');
exception when duplicate_object then null; end $$;

-- ── org_programs — the shared initiative primitive ──────────────────────────
create table if not exists public.org_programs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid references public.profiles(id) on delete set null,
  kind            program_kind   not null default 'program',
  status          program_status not null default 'active',
  title           text not null,
  summary         text,
  description     text,
  location        text,          -- region / district / venue — powers "reach" metrics
  capacity        integer,       -- optional target (seats, beneficiaries, attendees)
  starts_at       timestamptz,
  ends_at         timestamptz,
  cover_url       text,
  tags            text[]  default '{}',
  metrics         jsonb   default '{}'::jsonb,  -- free-form outcome counters per vertical
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists org_programs_org_idx    on public.org_programs(organization_id);
create index if not exists org_programs_kind_idx   on public.org_programs(kind);
create index if not exists org_programs_status_idx on public.org_programs(status);

-- ── program_participants — enrollments / beneficiaries / volunteers / members ─
-- user_id is nullable so institutions can log aggregate or off-platform reach
-- (e.g. citizens served) without every person holding an account.
create table if not exists public.program_participants (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.org_programs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  external_name   text,          -- when the participant is not a platform user
  role            text not null default 'participant',  -- participant|beneficiary|volunteer|graduate|member|attendee|provider
  status          text not null default 'enrolled',     -- enrolled|active|completed|placed|graduated|dropped
  outcome         jsonb default '{}'::jsonb,
  joined_at       timestamptz default now(),
  unique (program_id, user_id)
);

create index if not exists prog_part_program_idx on public.program_participants(program_id);
create index if not exists prog_part_org_idx     on public.program_participants(organization_id);
create index if not exists prog_part_user_idx    on public.program_participants(user_id);
create index if not exists prog_part_role_idx    on public.program_participants(role);

-- ── updated_at trigger (reuse the shared touch fn from the organizations model) ─
drop trigger if exists org_programs_touch on public.org_programs;
create trigger org_programs_touch before update on public.org_programs
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.org_programs         enable row level security;
alter table public.program_participants enable row level security;

-- Programs: publicly readable when live (fuels the public org page / discovery);
-- drafts and archives stay manager-only. Writes are manager-only.
drop policy if exists org_programs_read   on public.org_programs;
drop policy if exists org_programs_write  on public.org_programs;
drop policy if exists org_programs_update on public.org_programs;
drop policy if exists org_programs_delete on public.org_programs;
create policy org_programs_read on public.org_programs for select
  using (status = 'active' or public.is_org_manager(organization_id, auth.uid()));
create policy org_programs_write on public.org_programs for insert to authenticated
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_programs_update on public.org_programs for update to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_programs_delete on public.org_programs for delete to authenticated
  using (public.is_org_manager(organization_id, auth.uid()));

-- Participants: managers of the org see all; a signed-in user sees their own
-- membership rows. Writes are manager-only (institutions enroll on behalf of).
drop policy if exists prog_part_read   on public.program_participants;
drop policy if exists prog_part_write  on public.program_participants;
drop policy if exists prog_part_update on public.program_participants;
drop policy if exists prog_part_delete on public.program_participants;
create policy prog_part_read on public.program_participants for select
  using (user_id = auth.uid() or public.is_org_manager(organization_id, auth.uid()));
create policy prog_part_write on public.program_participants for insert to authenticated
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy prog_part_update on public.program_participants for update to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));
create policy prog_part_delete on public.program_participants for delete to authenticated
  using (public.is_org_manager(organization_id, auth.uid()));

-- ── Realtime ────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.org_programs;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.program_participants;
exception when duplicate_object then null; end $$;
