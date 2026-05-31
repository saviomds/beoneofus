-- Run this once in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates the shop_orders table used by /api/orders and /api/admin/orders

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  items        JSONB NOT NULL DEFAULT '[]',
  total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'processing'
               CHECK (status IN ('processing','dispatched','out_delivery','delivered','cancelled')),
  tracking     TEXT,
  address      TEXT,
  eta          TEXT,
  discreet     BOOLEAN NOT NULL DEFAULT true,
  payment_reference TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS shop_orders_user_id_idx ON public.shop_orders(user_id);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx  ON public.shop_orders(status);

-- Enable Row Level Security
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

-- Users can only read their own orders
CREATE POLICY "Users can view their own orders"
  ON public.shop_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (API routes) can do everything — bypasses all policies
-- (No policy needed for service role; it bypasses RLS automatically)

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_shop_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION update_shop_orders_updated_at();
