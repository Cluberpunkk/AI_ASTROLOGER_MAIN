-- Add session lifecycle tracking columns to chat_sessions
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS disconnect_reason TEXT;

-- Add constraint for status values
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_status_check 
  CHECK (status IN ('active', 'ended', 'abandoned')) NOT VALID;

-- Create index for finding stale sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status_heartbeat 
  ON public.chat_sessions(status, last_heartbeat_at) 
  WHERE status = 'active';