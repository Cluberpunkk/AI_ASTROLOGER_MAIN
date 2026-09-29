-- Make user_id nullable in chat_sessions (for public access)
ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to allow public access
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;

-- Allow anyone to create, read, update sessions
CREATE POLICY "Anyone can create sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view sessions"
  ON public.chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update sessions"
  ON public.chat_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete sessions"
  ON public.chat_sessions FOR DELETE
  USING (true);

-- Update messages policies to allow public access
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON public.chat_messages;

CREATE POLICY "Anyone can view messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);