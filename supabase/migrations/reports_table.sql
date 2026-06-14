-- ============================================================
-- reports table — Content Reporting feature
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT        NOT NULL CHECK (content_type IN ('post', 'comment', 'profile', 'page_post', 'group', 'event')),
  content_id   UUID        NOT NULL,
  reason       TEXT        NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'violence', 'other')),
  details      TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for fast admin queries by status and type
CREATE INDEX IF NOT EXISTS idx_reports_status      ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_content     ON public.reports (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter    ON public.reports (reporter_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can only read their own reports (not others')
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Only service role (admin) can update status — no RLS policy needed for UPDATE
-- (service role bypasses RLS by default)
