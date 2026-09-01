-- AI re-evaluation of recommendations.
--
-- After new data arrives, the engine re-checks each open recommendation against
-- its original trigger. If the underlying problem is solved — by the action taken
-- or externally — the recommendation auto-transitions to 'resolved' with a note
-- explaining what changed and by how much:
--   "Volunteer shortage resolved — 5 volunteers now cover your active campaigns."
--   "Improved — Rural North completion rose 20% -> 34% (+14 pts)."
--
-- Idempotent / guarded.
alter type recommendation_status add value if not exists 'resolved';

alter table public.org_recommendations
  add column if not exists resolution_note text,
  add column if not exists resolved_at    timestamptz;
