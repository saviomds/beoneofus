-- ═══════════════════════════════════════════════════════════════════════════
-- CORE TABLES MIGRATION — BeOneOfUs Platform
-- Creates all tables referenced in API routes that may be missing
-- Uses CREATE TABLE IF NOT EXISTS to be safe on existing deployments
-- ═══════════════════════════════════════════════════════════════════════════

-- ── auth_otp ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_otp (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  used       BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_otp_email_idx ON public.auth_otp (email);
ALTER TABLE public.auth_otp ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role manages OTPs" ON public.auth_otp
  USING (true) WITH CHECK (true);

-- ── profiles (ensure extended columns exist) ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name         TEXT,
  ADD COLUMN IF NOT EXISTS headline          TEXT,
  ADD COLUMN IF NOT EXISTS location          TEXT,
  ADD COLUMN IF NOT EXISTS skills            TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS github            TEXT,
  ADD COLUMN IF NOT EXISTS website           TEXT,
  ADD COLUMN IF NOT EXISTS work_status       TEXT,
  ADD COLUMN IF NOT EXISTS banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS status            TEXT,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS visibility        JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS education         JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS experience        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certifications    JSONB DEFAULT '[]';

-- ── messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT,
  is_read      BOOLEAN DEFAULT false,
  is_deleted   BOOLEAN DEFAULT false,
  reply_to     UUID REFERENCES public.messages(id),
  media_url    TEXT,
  media_type   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_read_idx     ON public.messages (receiver_id, is_read);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own messages" ON public.messages;
CREATE POLICY "Users see their own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
CREATE POLICY "Users send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users update their messages" ON public.messages;
CREATE POLICY "Users update their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- ── posts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT,
  content        TEXT,
  code_snippet   TEXT,
  code_lang      TEXT,
  image_url      TEXT,
  media_items    JSONB DEFAULT '[]',
  tags           TEXT[] DEFAULT '{}',
  visibility     TEXT DEFAULT 'public',
  likes_count    INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count   INTEGER DEFAULT 0,
  bookmarks_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_user_idx       ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts (created_at DESC);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public posts are readable" ON public.posts;
CREATE POLICY "Public posts are readable" ON public.posts
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create posts" ON public.posts;
CREATE POLICY "Users create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own posts" ON public.posts;
CREATE POLICY "Users update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own posts" ON public.posts;
CREATE POLICY "Users delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- ── post_likes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can see likes" ON public.post_likes;
CREATE POLICY "Anyone can see likes" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own likes" ON public.post_likes;
CREATE POLICY "Users manage own likes" ON public.post_likes
  FOR ALL USING (auth.uid() = user_id);

-- ── post_comments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  parent_id  UUID REFERENCES public.post_comments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are readable" ON public.post_comments;
CREATE POLICY "Comments are readable" ON public.post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create comments" ON public.post_comments;
CREATE POLICY "Users create comments" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own comments" ON public.post_comments;
CREATE POLICY "Users delete own comments" ON public.post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ── post_bookmarks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.post_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.post_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- ── connections ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS connections_sender_idx   ON public.connections (sender_id);
CREATE INDEX IF NOT EXISTS connections_receiver_idx ON public.connections (receiver_id);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own connections" ON public.connections;
CREATE POLICY "Users see own connections" ON public.connections
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users manage own connections" ON public.connections;
CREATE POLICY "Users manage own connections" ON public.connections
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  title       TEXT,
  message     TEXT,
  link        TEXT,
  unread      BOOLEAN DEFAULT true,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_receiver_idx ON public.notifications (receiver_id, unread);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ── endorsements ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.endorsements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endorsed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endorser_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  skill       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (endorsed_id, endorser_id, skill)
);
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view endorsements" ON public.endorsements;
CREATE POLICY "Anyone can view endorsements" ON public.endorsements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage endorsements" ON public.endorsements;
CREATE POLICY "Users manage endorsements" ON public.endorsements
  FOR ALL USING (auth.uid() = endorser_id);

-- ── reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  content      TEXT,
  verified     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (reviewer_id, reviewee_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create reviews" ON public.reviews;
CREATE POLICY "Users create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- ── reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id   UUID,
  target_type TEXT CHECK (target_type IN ('user', 'post', 'comment', 'service')),
  reason      TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can report" ON public.reports;
CREATE POLICY "Users can report" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
CREATE POLICY "Admins can view reports" ON public.reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── job_applications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id         TEXT NOT NULL,
  applicant_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter   TEXT,
  portfolio_url  TEXT,
  status         TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicants see own applications" ON public.job_applications;
CREATE POLICY "Applicants see own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = applicant_id);
DROP POLICY IF EXISTS "Users create applications" ON public.job_applications;
CREATE POLICY "Users create applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- ── credentials ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credentials (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT DEFAULT 'Certificate' CHECK (type IN ('Certificate', 'Badge', 'Achievement')),
  issuer        TEXT,
  issued_at     TIMESTAMPTZ DEFAULT now(),
  hash          TEXT UNIQUE,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Credentials are public" ON public.credentials;
CREATE POLICY "Credentials are public" ON public.credentials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own credentials" ON public.credentials;
CREATE POLICY "Users manage own credentials" ON public.credentials
  FOR ALL USING (auth.uid() = user_id);

-- ── platform_settings (ensure exists) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO public.platform_settings (key, value) VALUES
  ('maintenance_mode',          'false'),
  ('registration_open',         'true'),
  ('require_email_verification','true'),
  ('session_timeout_hours',     '24')
ON CONFLICT (key) DO NOTHING;

-- ── activities ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_user_idx ON public.activities (user_id, created_at DESC);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own activities" ON public.activities;
CREATE POLICY "Users see own activities" ON public.activities
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create activities" ON public.activities;
CREATE POLICY "Users create activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── stories ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url  TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  caption    TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active stories are readable" ON public.stories;
CREATE POLICY "Active stories are readable" ON public.stories
  FOR SELECT USING (expires_at > now());
DROP POLICY IF EXISTS "Users manage own stories" ON public.stories;
CREATE POLICY "Users manage own stories" ON public.stories
  FOR ALL USING (auth.uid() = user_id);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
