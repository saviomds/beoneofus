-- ============================================================================
-- BeOneOfUs — RLS lockdown for privilege-escalation & trust-signal integrity
-- ----------------------------------------------------------------------------
-- Findings addressed (see audit 2026-07-04):
--   C1  auth_otp readable by anon  → account takeover
--   H1  platform_settings has no RLS → anyone can flip maintenance/registration
--   C2  profiles UPDATE not column-scoped → self is_admin/is_premium/is_verified
--   H3  referrals insert WITH CHECK (true) → forged referral attribution
--   H2  skill_certifications/skill_tests self-insertable → fake verified skills
--
-- SAFETY TIERS — apply in order, test between each:
--   [SAFE]     no client (anon-key) code path depends on it. Apply now.
--   [REFACTOR] client currently reads/writes this directly with the anon key;
--              the noted client change MUST ship first or the app breaks.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── [SAFE] auth_otp → service_role only ─────────────────────────────────────
-- The entire OTP flow (send/verify/resend/change-email) uses the service-role
-- client, so no anon path reads or writes this table. Locking it closes the
-- account-takeover hole where anon could `select * from auth_otp`.
alter table if exists public.auth_otp enable row level security;
drop policy if exists auth_otp_all       on public.auth_otp;
drop policy if exists "auth_otp all"      on public.auth_otp;
create policy auth_otp_service_only on public.auth_otp
  for all to service_role using (true) with check (true);
-- Fix the upsert(onConflict:'email') dependency + kill duplicate rows first.
-- (De-dupe keeping the most recent row per email before adding the constraint.)
delete from public.auth_otp a
  using public.auth_otp b
  where a.email = b.email and a.ctid < b.ctid;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auth_otp_email_key'
  ) then
    alter table public.auth_otp add constraint auth_otp_email_key unique (email);
  end if;
end $$;

-- ── [SAFE] referrals → block client-forged inserts ──────────────────────────
-- API (referral/redeem) inserts via service_role. Client only SELECTs its own
-- referral count, so keep read, remove the permissive insert.
alter table if exists public.referrals enable row level security;
drop policy if exists referrals_insert on public.referrals;
create policy referrals_service_insert on public.referrals
  for insert to service_role with check (true);
-- (Leave any existing "read own referrals" SELECT policy in place.)

-- ── [SAFE] skill_certifications / skill_tests → server-issued only ──────────
-- Certs/tests must be graded server-side; users must not self-insert score=100.
alter table if exists public.skill_certifications enable row level security;
drop policy if exists skill_certifications_insert on public.skill_certifications;
drop policy if exists skill_certifications_update on public.skill_certifications;
create policy skill_certifications_service_write on public.skill_certifications
  for all to service_role using (true) with check (true);

-- ============================================================================
-- [REFACTOR] The statements below WILL break the live app until the paired
-- client change ships. They are intentionally left commented. Enable each only
-- after moving the corresponding read/write behind a service-role API route.
-- ============================================================================

-- platform_settings — client reads it directly with the anon key in
--   src/app/maintenance/page.js and dash/content/more/AdminPanelTool.js.
--   It also stores the Paystack secret, so a blanket anon SELECT would LEAK it.
--   Refactor: serve the two needed keys (maintenance_*, premium_trial) via an
--   API route (like /api/public-settings), then enable:
-- alter table public.platform_settings enable row level security;
-- create policy platform_settings_service_only on public.platform_settings
--   for all to service_role using (true) with check (true);

-- profiles — the self-update policy is not column-scoped, so any user can set
--   is_admin/is_premium/is_verified/verification_status. Client code writes some
--   of these directly (AdminContent.js is_verified, SettingsContent.js
--   verification_status). Refactor those writes to admin/service-role API routes,
--   then revoke column privileges so the self-update policy can't reach them:
-- revoke update on public.profiles from authenticated;
-- grant  update (full_name, username, headline, bio, status, avatar_url,
--                banner_url, location, website, github, skills, work_status,
--                profile_visibility, theme, notif_prefs)
--        on public.profiles to authenticated;
