-- Partnerships / sponsorship proposals
-- Run this once in the Supabase SQL editor.

create table if not exists public.partnerships (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  company_name     text        not null,
  type             text        not null,
  proposal         text        not null,
  target_audience  text,
  budget_range     text,
  contact_email    text        not null,
  status           text        not null default 'pending'
                               check (status in ('pending', 'accepted', 'declined')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists partnerships_updated_at on public.partnerships;
create trigger partnerships_updated_at
  before update on public.partnerships
  for each row execute procedure public.set_updated_at();

-- Indexes
create index if not exists partnerships_user_id_idx  on public.partnerships(user_id);
create index if not exists partnerships_status_idx    on public.partnerships(status);
create index if not exists partnerships_created_idx   on public.partnerships(created_at desc);

-- Row-Level Security
alter table public.partnerships enable row level security;

-- Any authenticated user can submit a proposal for themselves
create policy "users can insert own proposals"
  on public.partnerships for insert
  with check (auth.uid() = user_id);

-- Users can read their own proposals (for "Mine" tab)
create policy "users can read own proposals"
  on public.partnerships for select
  using (auth.uid() = user_id);

-- Admins and founders can read all proposals
create policy "admins read all proposals"
  on public.partnerships for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'founder')
    )
  );

-- Admins and founders can update status
create policy "admins update proposal status"
  on public.partnerships for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'founder')
    )
  );

-- Enable Realtime for this table (run in Supabase dashboard if not already done)
-- alter publication supabase_realtime add table public.partnerships;
