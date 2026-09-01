-- #2: lock the trust tables so clients can't write them directly.
-- Verified skills are graded server-side (/api/skills/test) and referral
-- attribution is created by /api/referral/redeem — both use the service role,
-- which bypasses RLS, so those endpoints are unaffected. We only remove the
-- client write policies (the exploit surface) and keep public/own reads.

-- skill_certifications: keep public SELECT (badges) + service write; drop client writes.
drop policy if exists "Users manage own skill certs"     on public.skill_certifications;
drop policy if exists "Users receive own certifications"  on public.skill_certifications;
drop policy if exists "Users update own certifications"   on public.skill_certifications;

-- skill_tests: drop client write ("manage"); allow reading own results only.
drop policy if exists "Users manage own skill tests" on public.skill_tests;
drop policy if exists skill_tests_select_own on public.skill_tests;
create policy skill_tests_select_own on public.skill_tests
  for select to authenticated using (auth.uid() = user_id);

-- referrals: close the public INSERT that let anyone forge attribution.
drop policy if exists "referrals_insert_service" on public.referrals;
