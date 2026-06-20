-- Add management columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status      TEXT    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS department  TEXT,
  ADD COLUMN IF NOT EXISTS views       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requirements TEXT[];

UPDATE public.jobs SET status = 'active' WHERE status IS NULL;
