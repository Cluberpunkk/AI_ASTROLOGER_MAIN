-- Create utm_tracking table
CREATE TABLE public.utm_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  page_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  total_duration_seconds INTEGER DEFAULT 0,
  page_url TEXT NOT NULL,
  device_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create page_analytics table
CREATE TABLE public.page_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  page_url TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  time_on_page_seconds INTEGER DEFAULT 0,
  scroll_depth_percent INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_events table
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.utm_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no authentication required)
CREATE POLICY "Anyone can insert utm tracking"
ON public.utm_tracking FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view utm tracking"
ON public.utm_tracking FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
ON public.user_sessions FOR UPDATE
USING (true);

CREATE POLICY "Anyone can view sessions"
ON public.user_sessions FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert page analytics"
ON public.page_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update page analytics"
ON public.page_analytics FOR UPDATE
USING (true);

CREATE POLICY "Anyone can view page analytics"
ON public.page_analytics FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert events"
ON public.user_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view events"
ON public.user_events FOR SELECT
USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_utm_tracking_visitor_id ON public.utm_tracking(visitor_id);
CREATE INDEX idx_utm_tracking_created_at ON public.utm_tracking(created_at DESC);

CREATE INDEX idx_user_sessions_visitor_id ON public.user_sessions(visitor_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_created_at ON public.user_sessions(created_at DESC);

CREATE INDEX idx_page_analytics_visitor_id ON public.page_analytics(visitor_id);
CREATE INDEX idx_page_analytics_session_id ON public.page_analytics(session_id);
CREATE INDEX idx_page_analytics_created_at ON public.page_analytics(created_at DESC);

CREATE INDEX idx_user_events_visitor_id ON public.user_events(visitor_id);
CREATE INDEX idx_user_events_session_id ON public.user_events(session_id);
CREATE INDEX idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX idx_user_events_created_at ON public.user_events(created_at DESC);