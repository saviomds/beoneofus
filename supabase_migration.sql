-- ============================================================
-- BeOneOfUs Platform — Full Roadmap Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES: new columns ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_config  JSONB    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills            TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS field             TEXT,
  ADD COLUMN IF NOT EXISTS profile_views     INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_to_collab    BOOLEAN  DEFAULT false;

-- ── 2. CERTIFICATES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  issuer         TEXT        DEFAULT 'BeOneOfUs',
  issued_at      TIMESTAMPTZ DEFAULT now(),
  verified       BOOLEAN     DEFAULT false,
  certificate_url TEXT,
  unique_code    TEXT        UNIQUE,
  credential_type TEXT       DEFAULT 'Certificate',  -- Certificate | Badge | Achievement
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates(user_id);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "certificates_select_own"
  ON certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "certificates_insert_own"
  ON certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "certificates_public_read"
  ON certificates FOR SELECT
  USING (true);

-- ── 3. PROJECTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collab_projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  field       TEXT,
  status      TEXT        DEFAULT 'active',     -- active | completed | archived
  visibility  TEXT        DEFAULT 'private',    -- public | invite_only | private
  tags        TEXT[]      DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_projects_owner_idx    ON collab_projects(owner_id);
CREATE INDEX IF NOT EXISTS collab_projects_status_idx   ON collab_projects(status);
CREATE INDEX IF NOT EXISTS collab_projects_visibility_idx ON collab_projects(visibility);

ALTER TABLE collab_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "projects_owner_all"
  ON collab_projects FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "projects_public_select"
  ON collab_projects FOR SELECT
  USING (visibility = 'public');

-- ── 4. PROJECT MEMBERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  project_id  UUID NOT NULL REFERENCES collab_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member',   -- owner | lead | member
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "project_members_select"
  ON project_members FOR SELECT
  USING (auth.uid() = user_id OR
         EXISTS (SELECT 1 FROM collab_projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "project_members_owner_insert"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM collab_projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  );

-- ── 5. FREELANCE SERVICES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  price_usd      NUMERIC(10,2) NOT NULL,
  delivery_days  INTEGER     DEFAULT 7,
  field          TEXT,
  category       TEXT        DEFAULT 'Service',  -- Service | Consulting | Design | Writing | Dev | Marketing
  tags           TEXT[]      DEFAULT '{}',
  is_active      BOOLEAN     DEFAULT true,
  orders_count   INTEGER     DEFAULT 0,
  rating_avg     NUMERIC(3,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_seller_idx    ON services(seller_id);
CREATE INDEX IF NOT EXISTS services_field_idx     ON services(field);
CREATE INDEX IF NOT EXISTS services_active_idx    ON services(is_active);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "services_public_select"
  ON services FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "services_owner_all"
  ON services FOR ALL
  USING (auth.uid() = seller_id);

-- ── 6. SERVICE ORDERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID        NOT NULL REFERENCES services(id) ON DELETE SET NULL,
  buyer_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT        DEFAULT 'pending',  -- pending | active | delivered | complete | disputed | cancelled
  amount_usd    NUMERIC(10,2) NOT NULL,
  requirements  TEXT,
  delivery_note TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_orders_buyer_idx  ON service_orders(buyer_id);
CREATE INDEX IF NOT EXISTS service_orders_seller_idx ON service_orders(seller_id);

ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "orders_parties_select"
  ON service_orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY IF NOT EXISTS "orders_buyer_insert"
  ON service_orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY IF NOT EXISTS "orders_parties_update"
  ON service_orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ── 7. PROFILE VIEWS (analytics) ────────────────────────────
CREATE TABLE IF NOT EXISTS profile_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewed_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ DEFAULT now(),
  country     TEXT
);

CREATE INDEX IF NOT EXISTS profile_views_viewed_idx ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS profile_views_date_idx   ON profile_views(viewed_at DESC);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profile_views_insert_any"
  ON profile_views FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "profile_views_owner_select"
  ON profile_views FOR SELECT
  USING (auth.uid() = viewed_id);

-- ── 8. SKILL SUGGESTIONS CACHE ──────────────────────────────
CREATE TABLE IF NOT EXISTS skill_suggestions (
  user_id      UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  suggestions  JSONB       DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "skill_suggestions_own"
  ON skill_suggestions FOR ALL
  USING (auth.uid() = user_id);

-- ── 9. USEFUL FUNCTION: increment profile views ─────────────
CREATE OR REPLACE FUNCTION increment_profile_views(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = target_user_id;
END;
$$;

-- ── Done ─────────────────────────────────────────────────────
