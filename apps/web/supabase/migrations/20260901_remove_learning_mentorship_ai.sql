-- ============================================================================
-- Remove the Learning / Certifications / Mentorship / user-facing-AI features
-- ============================================================================
-- These product areas were retired. This migration drops their tables; CASCADE
-- also removes the dependent foreign keys, RLS policies, triggers, grants and
-- indexes created for them across:
--   supabase/migrations/20260620_core_tables.sql        (credentials)
--   supabase/migrations/20260624_talent_ecosystem.sql   (mentors, skill_*, interview_*, career_analysis)
--   supabase/migrations/credential_trade_listings.sql
--   supabase/migrations/20260704_rls_lockdown.sql / 20260704_lock_trust_tables.sql
--
-- NOTE: `courses`, `course_media`, `user_course_progress` and `user_certificates`
-- were referenced by the deleted /Academy and /LearnPage routes but are NOT
-- present in the local migration history (they were created ad-hoc on the
-- hosted project). The DROPs below are guarded with IF EXISTS so this file is
-- safe whether or not they exist. Before running, confirm the full list against
-- the live schema (`supabase db diff` / MCP `list_tables`).
--
-- This is destructive and irreversible. Take a backup first.
-- ============================================================================

begin;

-- ── Mentorship / coaching ────────────────────────────────────────────────────
drop table if exists public.mentor_sessions          cascade;
drop table if exists public.mentors                   cascade;

-- ── Certifications / verified skills ─────────────────────────────────────────
drop table if exists public.skill_tests               cascade;
drop table if exists public.skill_certifications      cascade;
drop table if exists public.credential_trade_listings cascade;
drop table if exists public.credentials               cascade;
drop table if exists public.user_certificates         cascade;

-- ── Education / courses ──────────────────────────────────────────────────────
drop table if exists public.user_course_progress      cascade;
drop table if exists public.course_media              cascade;
drop table if exists public.courses                   cascade;

-- ── User-facing AI (Career AI, Interview AI, AI Assistant) ───────────────────
drop table if exists public.career_analysis           cascade;
drop table if exists public.interview_answers         cascade;
drop table if exists public.interview_rooms           cascade;
drop table if exists public.ai_chat_messages          cascade;

-- If the live schema shows dedicated profile columns for these features with no
-- other consumer (e.g. is_mentor, mentor_bio, mentor_rate), drop them here too:
-- alter table public.profiles drop column if exists is_mentor;
-- alter table public.profiles drop column if exists mentor_bio;

commit;
