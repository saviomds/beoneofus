-- ============================================================
-- chat_tasks: per-DM tasks owned by the viewing user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_tasks (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  due          text,
  priority     text        DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  done         boolean     DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- Fast lookup by owner + conversation partner
CREATE INDEX IF NOT EXISTS chat_tasks_lookup
  ON public.chat_tasks (user_id, chat_user_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.chat_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own chat tasks"      ON public.chat_tasks;
DROP POLICY IF EXISTS "Assigned users see chat tasks"  ON public.chat_tasks;
DROP POLICY IF EXISTS "Users insert own chat tasks"    ON public.chat_tasks;
DROP POLICY IF EXISTS "Users update own chat tasks"    ON public.chat_tasks;
DROP POLICY IF EXISTS "Users delete own chat tasks"    ON public.chat_tasks;

-- Task owner sees all their tasks
CREATE POLICY "Users see own chat tasks"
  ON public.chat_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Assigned user can see tasks assigned to them
CREATE POLICY "Assigned users see chat tasks"
  ON public.chat_tasks FOR SELECT
  USING (auth.uid() = assigned_to);

CREATE POLICY "Users insert own chat tasks"
  ON public.chat_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own chat tasks"
  ON public.chat_tasks FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own chat tasks"
  ON public.chat_tasks FOR DELETE
  USING (auth.uid() = user_id);
