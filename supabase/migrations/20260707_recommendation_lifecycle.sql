-- Recommendation lifecycle + permanent program linkage + outcome tracking.
--
-- Turns recommendations from a suggestion list into a management tool:
--   New (suggested) → Accepted → In Progress (linked program active)
--     → Completed (linked program finished) ; plus Dismissed / Archived.
-- created_program_id is the permanent relationship to the program a
-- recommendation produced, so outcomes (participants, completion, impact) and
-- an AI success rate can be measured against real results.
--
-- Applied to prod in two steps: ALTER TYPE ADD VALUE must commit before the data
-- UPDATE can reference the new values (Postgres cannot use a new enum value in
-- the same transaction that adds it). Idempotent / guarded.

-- ── Step 1: enum values + linkage column ────────────────────────────────────
alter type recommendation_status add value if not exists 'in_progress';
alter type recommendation_status add value if not exists 'completed';
alter type recommendation_status add value if not exists 'archived';

alter table public.org_recommendations
  add column if not exists created_program_id uuid references public.org_programs(id) on delete set null;

create index if not exists org_recs_program_idx on public.org_recommendations(created_program_id);

-- ── Step 2: migrate legacy statuses (run in a SEPARATE transaction) ──────────
update public.org_recommendations set status = 'completed' where status = 'done';
update public.org_recommendations set status = 'archived'  where status = 'expired';
