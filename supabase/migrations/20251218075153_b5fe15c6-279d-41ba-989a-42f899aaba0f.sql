-- Add columns for read receipts and nudge tracking
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS is_nudge BOOLEAN DEFAULT false;

-- Add constraint for delivery_status values
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_delivery_status_check 
CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read'));