-- ============================================================================
-- Public homepage stats — SECURITY DEFINER RPC
-- ----------------------------------------------------------------------------
-- The landing page counts profiles/jobs/connections with the anon
-- key by selecting straight off those tables. If a table's RLS policy scopes
-- SELECT to the involved users (e.g. "connections visible to their two
-- participants"), an anonymous visitor's count comes back 0 rows — not an
-- error, just an empty, RLS-filtered result — so the homepage stat bar shows
-- "0+" even when the platform has real data.
--
-- get_public_stats() runs as SECURITY DEFINER (like the existing
-- increment_page_views RPC) so it reports true platform-wide totals to any
-- caller, without granting anon a blanket SELECT on the underlying tables.
-- Idempotent: safe to re-run.
-- ============================================================================

create or replace function public.get_public_stats()
returns table (
  professionals bigint,
  jobs bigint,
  connections bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.jobs),
    (select count(*) from public.connections where status = 'accepted');
$$;

grant execute on function public.get_public_stats() to anon, authenticated;
