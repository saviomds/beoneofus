-- Platform-wide statistics (page views, etc.)
-- Run once in the Supabase SQL editor.

create table if not exists public.platform_stats (
  key        text        primary key,
  value      bigint      not null default 0,
  updated_at timestamptz not null default now()
);

-- Start from 0 — real visits only
insert into public.platform_stats (key, value)
values ('page_views', 0)
on conflict (key) do nothing;

-- RLS: anyone can read stats, nobody can write directly
alter table public.platform_stats enable row level security;

create policy "public read platform stats"
  on public.platform_stats for select using (true);

-- Atomic increment via RPC (bypasses RLS with security definer)
create or replace function public.increment_page_views()
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.platform_stats
  set value      = value + 1,
      updated_at = now()
  where key = 'page_views'
  returning value;
$$;
