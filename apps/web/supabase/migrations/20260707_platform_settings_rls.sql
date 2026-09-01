-- ============================================================================
-- BeOneOfUs — Close the platform_settings secret leak (audit H1 / critical)
-- ----------------------------------------------------------------------------
-- Problem: platform_settings had NO row-level security, so the browser anon key
--   could `select * from platform_settings` and read `paystack_secret_key`
--   (and any other secret stored there).
--
-- Fix WITHOUT breaking the app: the only anon-key client paths read/write a small
-- set of NON-secret keys —
--   • platform_version   (usePlatformVersion hook, founder-dashboard read+write)
--   • premium_trial       (AdminPanelTool read)
--   • maintenance_*, registration_open, platform_name, … (public settings)
-- So we enable RLS and expose ONLY an allow-list of safe keys to anon/authenticated.
-- Secrets (paystack_secret_key, anything not on the list) become invisible to the
-- anon key. Server routes use the service_role client, which bypasses RLS.
--
-- Allow-list (not block-list) on purpose: any future secret key is protected by
-- default until explicitly published here.
-- Idempotent: safe to re-run.
-- ============================================================================

alter table if exists public.platform_settings enable row level security;

-- Keys the browser (anon / authenticated) is allowed to READ.
-- Everything else — notably paystack_secret_key — is denied by omission.
drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings
  for select to anon, authenticated
  using (
    key = any (array[
      'platform_version',
      'premium_trial',
      'premium_enabled',
      'maintenance_mode',
      'maintenance_message',
      'registration_open',
      'platform_name',
      'support_email',
      'show_onboarding',
      'require_email_verification',
      'premium_monthly_price_usd',
      'premium_annual_price_usd'
    ])
  );

-- Preserve the one legitimate anon-key WRITE: the founder dashboard edits
-- `platform_version` directly. Scope the write policy to exactly that key so no
-- other setting (and no secret) can be written from the client.
drop policy if exists platform_settings_version_write on public.platform_settings;
create policy platform_settings_version_write on public.platform_settings
  for insert to authenticated
  with check (key = 'platform_version');
drop policy if exists platform_settings_version_update on public.platform_settings;
create policy platform_settings_version_update on public.platform_settings
  for update to authenticated
  using (key = 'platform_version')
  with check (key = 'platform_version');

-- Server (service_role) keeps full access for admin settings, Paystack config,
-- premium-trial toggles, and public-settings reads.
drop policy if exists platform_settings_service_all on public.platform_settings;
create policy platform_settings_service_all on public.platform_settings
  for all to service_role
  using (true) with check (true);
