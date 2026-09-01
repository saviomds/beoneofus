-- ============================================================
-- Credential Trade Listings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.credential_trade_listings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID        NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  seller_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asking_price  NUMERIC(10,2),
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(credential_id)
);

ALTER TABLE public.credential_trade_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_listings_select_all"   ON public.credential_trade_listings;
CREATE POLICY "trade_listings_select_all" ON public.credential_trade_listings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "trade_listings_insert_own"   ON public.credential_trade_listings;
CREATE POLICY "trade_listings_insert_own" ON public.credential_trade_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "trade_listings_update_own"   ON public.credential_trade_listings;
CREATE POLICY "trade_listings_update_own" ON public.credential_trade_listings
  FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "trade_listings_delete_own"   ON public.credential_trade_listings;
CREATE POLICY "trade_listings_delete_own" ON public.credential_trade_listings
  FOR DELETE USING (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS idx_trade_listings_status ON public.credential_trade_listings (status);
CREATE INDEX IF NOT EXISTS idx_trade_listings_seller ON public.credential_trade_listings (seller_id);
