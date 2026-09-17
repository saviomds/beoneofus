-- ============================================================================
-- Remove the "Build Together" project marketplace feature
-- ============================================================================
-- /dash/projects and its whole team-collaboration flow (browse/create
-- projects, join requests, team membership, team chat, code merge requests)
-- were retired. This migration drops their tables; CASCADE also removes the
-- dependent foreign keys, RLS policies, triggers, grants, indexes and
-- realtime publication entries created for them in:
--   supabase/migrations/20260624_talent_ecosystem.sql   (projects, project_members, project_requests)
--
-- NOTE: `project_messages` and `project_merge_requests` are NOT present in
-- the local migration history — they were only ever referenced by dead,
-- unimported client code (dash/content/explore/LiveChat.js, CodeMerge.js)
-- as ad-hoc "run this in the SQL editor" setup snippets, so they may not
-- exist on the live project at all. The DROPs below are guarded with
-- IF EXISTS so this file is safe whether or not they were ever created.
--
-- `public.projects` was also queried — but never rendered — by the user
-- profile page's dead "portfolio projects" fetch (apps/web/src/app/u/[username]/page.js);
-- that dead code was removed alongside this migration, so nothing else
-- depends on this table.
--
-- This is destructive and irreversible. Take a backup first.
-- ============================================================================

begin;

drop table if exists public.project_merge_requests cascade;
drop table if exists public.project_messages        cascade;
drop table if exists public.project_requests        cascade;
drop table if exists public.project_members         cascade;
drop table if exists public.projects                cascade;

commit;
