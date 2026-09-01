-- ============================================================================
-- BeOneOfUs — Organization social layer: followers, updates, events, products,
-- and page-view stats. Turns the company page from a brochure into a live
-- presence. Idempotent; reuses public.is_org_manager(org, uid) for write gating.
-- ============================================================================

-- ── Followers ───────────────────────────────────────────────────────────────
create table if not exists public.org_followers (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id)      on delete cascade,
  created_at      timestamptz default now(),
  primary key (organization_id, user_id)
);
create index if not exists org_followers_user_idx on public.org_followers(user_id);
alter table public.org_followers enable row level security;
drop policy if exists org_followers_read   on public.org_followers;
drop policy if exists org_followers_insert on public.org_followers;
drop policy if exists org_followers_delete on public.org_followers;
create policy org_followers_read   on public.org_followers for select using (true);
create policy org_followers_insert on public.org_followers for insert to authenticated with check (user_id = auth.uid());
create policy org_followers_delete on public.org_followers for delete to authenticated using (user_id = auth.uid());

-- ── Updates / posts ─────────────────────────────────────────────────────────
create table if not exists public.org_posts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id       uuid references public.profiles(id) on delete set null,
  content         text not null,
  image_url       text,
  created_at      timestamptz default now()
);
create index if not exists org_posts_org_idx on public.org_posts(organization_id, created_at desc);
alter table public.org_posts enable row level security;
drop policy if exists org_posts_read  on public.org_posts;
drop policy if exists org_posts_write on public.org_posts;
create policy org_posts_read  on public.org_posts for select using (true);
create policy org_posts_write on public.org_posts for all to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));

-- ── Events ──────────────────────────────────────────────────────────────────
create table if not exists public.org_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  location        text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists org_events_org_idx on public.org_events(organization_id, starts_at);
alter table public.org_events enable row level security;
drop policy if exists org_events_read  on public.org_events;
drop policy if exists org_events_write on public.org_events;
create policy org_events_read  on public.org_events for select using (true);
create policy org_events_write on public.org_events for all to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));

-- ── Products / services ─────────────────────────────────────────────────────
create table if not exists public.org_products (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  price           text,
  url             text,
  image_url       text,
  created_at      timestamptz default now()
);
create index if not exists org_products_org_idx on public.org_products(organization_id, created_at desc);
alter table public.org_products enable row level security;
drop policy if exists org_products_read  on public.org_products;
drop policy if exists org_products_write on public.org_products;
create policy org_products_read  on public.org_products for select using (true);
create policy org_products_write on public.org_products for all to authenticated
  using (public.is_org_manager(organization_id, auth.uid()))
  with check (public.is_org_manager(organization_id, auth.uid()));

-- ── Page-view stat ──────────────────────────────────────────────────────────
alter table public.organizations add column if not exists view_count bigint default 0;
-- SECURITY DEFINER so an anonymous visitor can bump the counter without holding
-- broad UPDATE rights on organizations.
create or replace function public.increment_org_view(org uuid)
returns void language sql security definer set search_path = public as $$
  update public.organizations set view_count = coalesce(view_count, 0) + 1 where id = org;
$$;
grant execute on function public.increment_org_view(uuid) to anon, authenticated;
