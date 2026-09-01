-- Organizations model — the 8-participant-type institutional backbone.
-- Applied to production 2026-07-03 via Supabase MCP; this file is the repo
-- record of the final schema state (safe to re-run; guarded / idempotent).

-- ── Institution participant types ──
do $$ begin
  create type organization_type as enum (
    'business','government','education','healthcare','ngo','community','other'
  );
exception when duplicate_object then null; end $$;

-- ── Canonical organization entity (generalizes the legacy `companies` table) ──
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null,
  type                organization_type not null default 'business',
  name                text not null,
  slug                text unique,
  tagline             text,
  description         text,
  logo_url            text,
  banner_url          text,
  website             text,
  location            text,
  country             text,
  size                text,
  founded_year        integer,
  sector              text,
  tech_stack          text[]  default '{}',
  focus_areas         text[]  default '{}',
  hiring              boolean default false,
  remote_policy       text,
  contact_email       text,
  socials             jsonb   default '{}'::jsonb,
  verification_status text    not null default 'unverified',
  is_verified         boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- owner FK -> profiles (profiles.id is itself FK'd to auth.users) so PostgREST
-- can embed the owner's profile, matching the companies convention.
alter table public.organizations drop constraint if exists organizations_owner_id_fkey;
alter table public.organizations
  add constraint organizations_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

create index if not exists organizations_type_idx    on public.organizations(type);
create index if not exists organizations_owner_idx    on public.organizations(owner_id);
create index if not exists organizations_verified_idx on public.organizations(is_verified);

-- ── Team membership ──
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null,
  role            text not null default 'member',  -- owner|admin|recruiter|member
  title           text,
  created_at      timestamptz default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members drop constraint if exists organization_members_user_id_fkey;
alter table public.organization_members
  add constraint organization_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists org_members_user_idx on public.organization_members(user_id);
create index if not exists org_members_org_idx  on public.organization_members(organization_id);

-- ── SECURITY DEFINER helper — avoids RLS recursion between the two tables ──
create or replace function public.is_org_manager(org uuid, uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from organizations o where o.id = org and o.owner_id = uid)
      or exists (select 1 from organization_members m
                 where m.organization_id = org and m.user_id = uid and m.role in ('owner','admin'));
$$;
revoke execute on function public.is_org_manager(uuid, uuid) from anon, public;

-- ── Auto-add creator as owner-member ──
create or replace function public.handle_new_organization()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_organization() from public, anon, authenticated;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ── updated_at ──
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ──
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists organizations_read   on public.organizations;
drop policy if exists organizations_insert on public.organizations;
drop policy if exists organizations_update on public.organizations;
drop policy if exists organizations_delete on public.organizations;
create policy organizations_read   on public.organizations for select using (true);
create policy organizations_insert on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_manager(id, auth.uid())) with check (public.is_org_manager(id, auth.uid()));
create policy organizations_delete on public.organizations for delete to authenticated using (owner_id = auth.uid());

drop policy if exists org_members_read   on public.organization_members;
drop policy if exists org_members_insert on public.organization_members;
drop policy if exists org_members_update on public.organization_members;
drop policy if exists org_members_delete on public.organization_members;
create policy org_members_read   on public.organization_members for select using (true);
create policy org_members_insert on public.organization_members for insert to authenticated with check (public.is_org_manager(organization_id, auth.uid()));
create policy org_members_update on public.organization_members for update to authenticated using (public.is_org_manager(organization_id, auth.uid()));
create policy org_members_delete on public.organization_members for delete to authenticated using (public.is_org_manager(organization_id, auth.uid()));
