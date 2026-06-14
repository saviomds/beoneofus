-- ============================================================
-- Referral System
-- ============================================================

-- 1. Add referral_code column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Backfill referral codes for existing profiles that don't have one
DO $$
DECLARE
  rec       RECORD;
  new_code  TEXT;
  collision BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := upper(substr(md5(random()::text || rec.id::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO collision;
      EXIT WHEN NOT collision;
    END LOOP;
    UPDATE public.profiles SET referral_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 3. Auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_code  TEXT;
  collision BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO collision;
      EXIT WHEN NOT collision;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- 4. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own"  ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "referrals_insert_service" ON public.referrals;
CREATE POLICY "referrals_insert_service" ON public.referrals
  FOR INSERT WITH CHECK (true); -- service role inserts; enforced in API

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals (referred_id);
