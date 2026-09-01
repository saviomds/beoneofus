-- ============================================================================
-- BeOneOfUs — Business / Organizations / Trust stack (idempotent reference)
-- ----------------------------------------------------------------------------
-- Safe to run any number of times. On your current production DB every object
-- already exists, so this is a no-op / self-heal. On a fresh Supabase project
-- it recreates the full stack the business console + trust layer depend on.
--
-- Mirrors live schema of project jwjrogchwfzofpaczaah as of 2026-07-03.
-- ============================================================================

-- ── Enum: organization_type ────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type organization_type as enum (
      'business', 'startup', 'nonprofit', 'government',
      'education', 'institution', 'community'
    );
  end if;
end $$;

-- ── Table: organizations ────────────────────────────────────────────────────
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  type                organization_type not null default 'business',
  name                text not null,
  slug                text not null unique,
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
  verification_status text    not null default 'unverified',  -- unverified | pending | verified | rejected
  is_verified         boolean not null default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists organizations_owner_idx on public.organizations(owner_id);
create index if not exists organizations_slug_idx  on public.organizations(slug);

-- ── Table: organization_members ─────────────────────────────────────────────
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member',  -- owner | admin | recruiter | program_manager | member
  title           text,
  created_at      timestamptz default now(),
  unique (organization_id, user_id)
);
create index if not exists org_members_org_idx  on public.organization_members(organization_id);
create index if not exists org_members_user_idx on public.organization_members(user_id);

-- ── Table: verification_requests ────────────────────────────────────────────
create table if not exists public.verification_requests (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete cascade,
  requester_id        uuid not null references auth.users(id) on delete cascade,
  registration_number text,
  document_url        text,          -- path inside the org-verification bucket
  note                text,
  status              text not null default 'pending',  -- pending | approved | rejected
  review_note         text,
  reviewer_id         uuid references auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz default now()
);
create index if not exists verif_req_org_idx    on public.verification_requests(organization_id);
create index if not exists verif_req_status_idx on public.verification_requests(status);

-- ── Helper: is_org_manager(org, uid) ────────────────────────────────────────
-- Owner, or a member with an elevated role. SECURITY DEFINER so RLS policies
-- can call it without recursing into the members table's own policies.
create or replace function public.is_org_manager(org uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organizations o where o.id = org and o.owner_id = uid)
      or exists (select 1 from organization_members m
                 where m.organization_id = org and m.user_id = uid
                   and m.role in ('owner','admin'));
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.verification_requests enable row level security;

-- organizations: world-readable; only owner/managers write
drop policy if exists organizations_read   on public.organizations;
drop policy if exists organizations_insert on public.organizations;
drop policy if exists organizations_update on public.organizations;
drop policy if exists organizations_delete on public.organizations;
create policy organizations_read   on public.organizations for select using (true);
create policy organizations_insert on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy organizations_update on public.organizations for update to authenticated using (is_org_manager(id, auth.uid()));
create policy organizations_delete on public.organizations for delete to authenticated using (owner_id = auth.uid());

-- organization_members: world-readable; managers manage rows
drop policy if exists org_members_read   on public.organization_members;
drop policy if exists org_members_insert on public.organization_members;
drop policy if exists org_members_update on public.organization_members;
drop policy if exists org_members_delete on public.organization_members;
create policy org_members_read   on public.organization_members for select using (true);
create policy org_members_insert on public.organization_members for insert to authenticated with check (true);
create policy org_members_update on public.organization_members for update to authenticated using (is_org_manager(organization_id, auth.uid()));
create policy org_members_delete on public.organization_members for delete to authenticated using (is_org_manager(organization_id, auth.uid()));

-- verification_requests: requester/managers can read own; managers insert
drop policy if exists verif_req_read   on public.verification_requests;
drop policy if exists verif_req_insert on public.verification_requests;
create policy verif_req_read   on public.verification_requests for select to authenticated
  using (requester_id = auth.uid() or is_org_manager(organization_id, auth.uid()));
create policy verif_req_insert on public.verification_requests for insert to authenticated
  with check (requester_id = auth.uid() and is_org_manager(organization_id, auth.uid()));

-- ── Storage bucket: org-verification (private) ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('org-verification', 'org-verification', false)
on conflict (id) do nothing;

-- Only org managers may upload/read their org's verification docs.
-- Convention: object path is "<organization_id>/<filename>".
drop policy if exists org_verif_upload on storage.objects;
drop policy if exists org_verif_read   on storage.objects;
create policy org_verif_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-verification'
    and is_org_manager((split_part(name, '/', 1))::uuid, auth.uid())
  );
create policy org_verif_read on storage.objects for select to authenticated
  using (
    bucket_id = 'org-verification'
    and is_org_manager((split_part(name, '/', 1))::uuid, auth.uid())
  );

-- ── updated_at auto-touch on organizations ──────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Done. Reputation signals need NO table — computed in src/lib/reputation.js
-- from existing reviews / endorsements / verified-identity data.
-- ============================================================================
