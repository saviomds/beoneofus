-- ============================================================
-- Theme preference + Notification preferences
-- ============================================================

-- theme_preference: persisted across devices
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system'
    CHECK (theme_preference IN ('light', 'dark', 'system'));

-- notification_prefs: granular per-type settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}';

-- No new RLS needed — profiles table already allows users to update their own row.
