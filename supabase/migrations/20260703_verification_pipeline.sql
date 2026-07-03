-- Trust layer: organization verification pipeline (request → review → approve/reject).
-- Applied to production 2026-07-03 via Supabase MCP; repo record (idempotent).

-- Admin check helper (SECURITY DEFINER avoids RLS recursion on profiles)
create or replace function public.is_platform_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from profiles where id = uid), false);
$$;
revoke execute on function public.is_platform_admin(uuid) from anon, public;

create table if not exists public.verification_requests (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete cascade,
  requester_id        uuid not null references public.profiles(id) on delete cascade,
  registration_number text,
  document_url        text,
  note                text,
  status              text not null default 'pending',  -- pending | approved | rejected
  review_note         text,
  reviewer_id         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  created_at          timestamptz default now()
);
create index if not exists verif_req_status_idx on public.verification_requests(status);
create index if not exists verif_req_org_idx    on public.verification_requests(organization_id);

alter table public.verification_requests enable row level security;

drop policy if exists verif_req_read   on public.verification_requests;
drop policy if exists verif_req_insert on public.verification_requests;
drop policy if exists verif_req_update on public.verification_requests;
create policy verif_req_read on public.verification_requests for select to authenticated
  using (requester_id = auth.uid()
         or (organization_id is not null and public.is_org_manager(organization_id, auth.uid()))
         or public.is_platform_admin(auth.uid()));
create policy verif_req_insert on public.verification_requests for insert to authenticated
  with check (requester_id = auth.uid()
              and organization_id is not null
              and public.is_org_manager(organization_id, auth.uid()));
create policy verif_req_update on public.verification_requests for update to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- Private bucket for verification documents (path: <organization_id>/<filename>)
insert into storage.buckets (id, name, public) values ('org-verification', 'org-verification', false)
  on conflict (id) do nothing;

drop policy if exists "org verif upload" on storage.objects;
drop policy if exists "org verif read"   on storage.objects;
create policy "org verif upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-verification'
              and public.is_org_manager(nullif((storage.foldername(name))[1], '')::uuid, auth.uid()));
create policy "org verif read" on storage.objects for select to authenticated
  using (bucket_id = 'org-verification'
         and (public.is_platform_admin(auth.uid())
              or public.is_org_manager(nullif((storage.foldername(name))[1], '')::uuid, auth.uid())));
