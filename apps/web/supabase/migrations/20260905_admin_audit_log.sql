-- Admin audit log — append-only trail of sensitive admin actions (bans,
-- deletes, admin grants, premium review, settings/Paystack changes,
-- application decisions, error-log resolution). Written from both
-- service-role API routes and directly from admin clients (see
-- src/lib/auditLog.js, AdminPanelTool.js, founder-dashboard/page.tsx).
--
-- Backfills a gap: /api/admin/delete-user and /api/account/delete already
-- inserted into this table before this migration existed, so the shape here
-- (actor_id, action, target_user_id, created_at) matches what's already in
-- production, extended with target_type/target_id/details for non-user
-- targets (subscriptions, applications, error logs, settings).

create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles(id) on delete set null,
  action         text not null,
  target_type    text,
  target_id      text,
  target_user_id uuid references public.profiles(id) on delete set null,
  details        jsonb default '{}'::jsonb,
  created_at     timestamptz default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id);
create index if not exists admin_audit_log_target_user_idx on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Service role full access" on public.admin_audit_log;
create policy "Service role full access" on public.admin_audit_log
  for all to service_role using (true) with check (true);

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log" on public.admin_audit_log
  for select to authenticated using (public.is_platform_admin(auth.uid()));

drop policy if exists "Admins can write own audit entries" on public.admin_audit_log;
create policy "Admins can write own audit entries" on public.admin_audit_log
  for insert to authenticated with check (
    actor_id = auth.uid() and public.is_platform_admin(auth.uid())
  );

-- No update/delete policy for `authenticated`/`anon` — the app-facing surface
-- is append-only, so no admin (even a malicious one) can alter or erase their
-- own trail through the product. The service_role key bypasses RLS as usual
-- (Postgres BYPASSRLS on that role), but it's never exposed to end users.
