-- ============================================================
-- SUPABASE SETUP — beoneofus platform
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION A: CREATE ALL TABLES
-- (RLS policies that cross-reference tables come after ALL
--  tables are created, to avoid "relation does not exist")
-- ────────────────────────────────────────────────────────────

-- 1. COURSES  (id is BIGINT serial — all FKs must be BIGINT)
CREATE TABLE IF NOT EXISTS courses (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  category      TEXT DEFAULT 'General',
  level         TEXT DEFAULT 'Beginner',
  duration      TEXT DEFAULT '',
  lessons       INT  DEFAULT 0,
  rating        NUMERIC(3,1) DEFAULT 0,
  topics        TEXT DEFAULT '',
  author        TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LESSONS
CREATE TABLE IF NOT EXISTS lessons (
  id         BIGSERIAL PRIMARY KEY,
  course_id  BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT DEFAULT '',
  sort_order INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- 3. USER LESSON PROGRESS
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    BIGINT NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  lesson_id    BIGINT NOT NULL REFERENCES lessons(id)    ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_ulp_user_course ON user_lesson_progress(user_id, course_id);

-- 4. USER COURSE PROGRESS
CREATE TABLE IF NOT EXISTS user_course_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    BIGINT NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_course_progress(user_id);

-- 5. USER CERTIFICATES
CREATE TABLE IF NOT EXISTS user_certificates (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certs_user ON user_certificates(user_id);

-- 6. USER ACTIVITY
CREATE TABLE IF NOT EXISTS user_activity (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  content    TEXT DEFAULT '',
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);

-- 7. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE,
  avatar_url TEXT,
  bio        TEXT DEFAULT '',
  role       TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 8. PAGES  (create table only — RLS after page_members exists)
CREATE TABLE IF NOT EXISTS pages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '📄',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility  TEXT DEFAULT 'public',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Patch any existing pages table that's missing columns
ALTER TABLE pages ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS icon        TEXT DEFAULT '📄';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS visibility  TEXT DEFAULT 'public';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pages_created_by ON pages(created_by);

-- 9. PAGE MESSAGES  (create table only — RLS after page_members exists)
CREATE TABLE IF NOT EXISTS page_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT DEFAULT '',
  type       TEXT DEFAULT 'text',
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_messages ADD COLUMN IF NOT EXISTS content  TEXT DEFAULT '';
ALTER TABLE page_messages ADD COLUMN IF NOT EXISTS type     TEXT DEFAULT 'text';
ALTER TABLE page_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_page_messages_page ON page_messages(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_messages_user ON page_messages(user_id);

-- 10. PAGE MEMBERS  (must exist before pages/page_messages RLS policies)
CREATE TABLE IF NOT EXISTS page_members (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id  UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     TEXT DEFAULT 'viewer',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (page_id, user_id)
);

ALTER TABLE page_members ADD COLUMN IF NOT EXISTS role     TEXT DEFAULT 'viewer';
ALTER TABLE page_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_page_members_page ON page_members(page_id);
CREATE INDEX IF NOT EXISTS idx_page_members_user ON page_members(user_id);


-- ────────────────────────────────────────────────────────────
-- SECTION B: ROW LEVEL SECURITY
-- All tables exist now — safe to write cross-table policies
-- ────────────────────────────────────────────────────────────

-- user_lesson_progress
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can read own lesson progress"   ON user_lesson_progress;
DROP POLICY IF EXISTS "users can insert own lesson progress" ON user_lesson_progress;
DROP POLICY IF EXISTS "users can update own lesson progress" ON user_lesson_progress;
CREATE POLICY "users can read own lesson progress"
  ON user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own lesson progress"
  ON user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own lesson progress"
  ON user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- user_course_progress
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can read own course progress"   ON user_course_progress;
DROP POLICY IF EXISTS "users can manage own course progress" ON user_course_progress;
CREATE POLICY "users can read own course progress"
  ON user_course_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can manage own course progress"
  ON user_course_progress FOR ALL USING (auth.uid() = user_id);

-- user_certificates
ALTER TABLE user_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can read own certificates"   ON user_certificates;
DROP POLICY IF EXISTS "users can insert own certificates" ON user_certificates;
CREATE POLICY "users can read own certificates"
  ON user_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own certificates"
  ON user_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can insert own activity" ON user_activity;
DROP POLICY IF EXISTS "users can read own activity"   ON user_activity;
CREATE POLICY "users can insert own activity"
  ON user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can read own activity"
  ON user_activity FOR SELECT USING (auth.uid() = user_id);

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "users can update own profile"   ON profiles;
DROP POLICY IF EXISTS "users can insert own profile"   ON profiles;
CREATE POLICY "profiles are publicly readable"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- pages  (page_members now exists — these policies are safe)
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public pages are visible to all"      ON pages;
DROP POLICY IF EXISTS "members can see their pages"          ON pages;
DROP POLICY IF EXISTS "authenticated users can create pages" ON pages;
DROP POLICY IF EXISTS "creator can update page"              ON pages;
DROP POLICY IF EXISTS "creator can delete page"              ON pages;

CREATE POLICY "public pages are visible to all"
  ON pages FOR SELECT
  USING (pages.visibility = 'public');

CREATE POLICY "members can see their pages"
  ON pages FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      pages.visibility = 'public'
      OR pages.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM page_members pm
        WHERE pm.page_id = pages.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "authenticated users can create pages"
  ON pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = pages.created_by);

CREATE POLICY "creator can update page"
  ON pages FOR UPDATE
  USING (
    pages.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM page_members pm
      WHERE pm.page_id = pages.id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

CREATE POLICY "creator can delete page"
  ON pages FOR DELETE
  USING (pages.created_by = auth.uid());

-- page_messages  (page_members now exists)
ALTER TABLE page_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page viewers can read messages"        ON page_messages;
DROP POLICY IF EXISTS "authenticated users can send messages" ON page_messages;
DROP POLICY IF EXISTS "users can delete own messages"         ON page_messages;

CREATE POLICY "page viewers can read messages"
  ON page_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_messages.page_id
        AND (
          p.visibility = 'public'
          OR p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM page_members pm
            WHERE pm.page_id = p.id AND pm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "authenticated users can send messages"
  ON page_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_messages.page_id
        AND (
          p.visibility = 'public'
          OR p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM page_members pm
            WHERE pm.page_id = p.id AND pm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "users can delete own messages"
  ON page_messages FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_messages.page_id AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM page_members pm
      WHERE pm.page_id = page_messages.page_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- page_members
ALTER TABLE page_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page admins can manage members"   ON page_members;
DROP POLICY IF EXISTS "members can read page membership" ON page_members;

CREATE POLICY "page admins can manage members"
  ON page_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_members.page_id AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM page_members pm2
      WHERE pm2.page_id = page_members.page_id
        AND pm2.user_id = auth.uid()
        AND pm2.role = 'admin'
    )
  );

CREATE POLICY "members can read page membership"
  ON page_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_members.page_id AND p.visibility = 'public'
    )
  );


-- ────────────────────────────────────────────────────────────
-- SECTION C: REAL-TIME PUBLICATION
-- Only adds a table if it isn't already in the publication.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  pub TEXT := 'supabase_realtime';
  tbls TEXT[] := ARRAY[
    'user_lesson_progress',
    'user_course_progress',
    'user_certificates',
    'pages',
    'page_messages',
    'page_members'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = pub AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION %I ADD TABLE %I', pub, t);
    END IF;
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION D: STORAGE BUCKET  (do this in the Dashboard UI)
-- ────────────────────────────────────────────────────────────
-- Storage → New bucket → Name: "page-files" → toggle Public ON
-- That's all — public buckets allow reads without a policy.
-- Authenticated upload is allowed because the bucket is public.
