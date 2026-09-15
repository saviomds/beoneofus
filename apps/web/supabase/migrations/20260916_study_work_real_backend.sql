-- ============================================================================
-- Study/Work Abroad — remove demo data, lock down self-approval, add real
-- document storage.
-- ============================================================================
-- The portal used to run on browser localStorage seeded with a fake demo
-- applicant (amina.demo@example.com / user-demo-001), best-effort mirrored to
-- these tables. The frontend has been rewired to read/write these tables
-- directly under RLS for real, signed-in beoneofus accounts (see
-- apps/web/src/app/_study-work/services/applicationService.ts) — this
-- migration cleans up the leftover demo rows and closes gaps that only
-- mattered once real accounts could reach these tables.
-- ============================================================================

begin;

-- ── 1. Remove the seed/demo data ────────────────────────────────────────────
-- Cascades (on delete cascade) take care of requirements/documents/
-- conversations/messages/notifications/timeline tied to these applications.
delete from public.study_work_applications where user_id = 'user-demo-001';
delete from public.study_work_applicant_profiles where user_id = 'user-demo-001';

-- ── 2. Guard against self-approval ──────────────────────────────────────────
-- The existing "own or admin update" RLS policy on study_work_applications
-- intentionally lets an owner update their own row (so they can keep editing
-- personal/study/work/travel/draft_step at any stage) — but that also let an
-- owner set `status` to anything, including CONFIRMED/APPROVED/COMPLETED.
-- This trigger closes that: any owner-initiated (non-service-role) update may
-- only move status DRAFT -> SUBMITTED; every other status change must come
-- from the admin API route (/api/study-work/admin), which uses the service
-- role key and is exempted below.
create or replace function public.study_work_guard_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'DRAFT' and new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, now());
    else
      raise exception 'Only staff can change application status from % to %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_study_work_guard_status on public.study_work_applications;
create trigger trg_study_work_guard_status
before update on public.study_work_applications
for each row execute function public.study_work_guard_status_transition();

-- ── 3. Real document storage ─────────────────────────────────────────────
-- Private bucket — objects are only reachable via a signed URL generated for
-- the owning applicant or an admin, never a public link. Object paths are
-- "<application_id>/<document_id>/<filename>", so ownership is checked via
-- the first path segment.
insert into storage.buckets (id, name, public)
values ('study-work-documents', 'study-work-documents', false)
on conflict (id) do nothing;

drop policy if exists "owner insert study-work docs" on storage.objects;
create policy "owner insert study-work docs" on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-work-documents'
  and exists (
    select 1 from public.study_work_applications a
    where a.id = (storage.foldername(name))[1]
    and a.user_id = auth.uid()::text
  )
);

drop policy if exists "owner or admin select study-work docs" on storage.objects;
create policy "owner or admin select study-work docs" on storage.objects for select to authenticated
using (
  bucket_id = 'study-work-documents'
  and (
    exists (
      select 1 from public.study_work_applications a
      where a.id = (storage.foldername(name))[1]
      and a.user_id = auth.uid()::text
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
  )
);

drop policy if exists "owner update study-work docs" on storage.objects;
create policy "owner update study-work docs" on storage.objects for update to authenticated
using (
  bucket_id = 'study-work-documents'
  and exists (
    select 1 from public.study_work_applications a
    where a.id = (storage.foldername(name))[1]
    and a.user_id = auth.uid()::text
  )
)
with check (
  bucket_id = 'study-work-documents'
  and exists (
    select 1 from public.study_work_applications a
    where a.id = (storage.foldername(name))[1]
    and a.user_id = auth.uid()::text
  )
);

commit;
