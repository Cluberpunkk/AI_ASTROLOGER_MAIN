-- Add reactions column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;