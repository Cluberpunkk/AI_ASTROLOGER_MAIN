-- Create feedback responses table
CREATE TABLE public.feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Section A
  experience_rating TEXT NOT NULL,
  is_first_time BOOLEAN NOT NULL,
  astrology_familiarity TEXT NOT NULL,
  chat_purpose TEXT[] NOT NULL,
  chat_purpose_other TEXT,
  
  -- Section B
  understanding_rating INTEGER NOT NULL CHECK (understanding_rating BETWEEN 1 AND 5),
  resonance_rating INTEGER NOT NULL CHECK (resonance_rating BETWEEN 1 AND 5),
  clarity_rating INTEGER NOT NULL CHECK (clarity_rating BETWEEN 1 AND 5),
  tone_rating INTEGER NOT NULL CHECK (tone_rating BETWEEN 1 AND 5),
  guidance_type TEXT NOT NULL,
  
  -- Section C
  ease_of_use_rating INTEGER NOT NULL CHECK (ease_of_use_rating BETWEEN 1 AND 5),
  response_speed TEXT NOT NULL,
  had_issues TEXT NOT NULL,
  issue_description TEXT,
  
  -- Section D
  got_what_needed TEXT NOT NULL,
  likelihood_use_again INTEGER NOT NULL CHECK (likelihood_use_again BETWEEN 0 AND 10),
  likelihood_recommend INTEGER NOT NULL CHECK (likelihood_recommend BETWEEN 0 AND 10),
  
  -- Section E
  liked_most TEXT,
  improvement_suggestions TEXT,
  wrong_or_insensitive TEXT,
  
  -- Section F
  sun_sign TEXT,
  age_range TEXT,
  country TEXT,
  
  -- Section G
  can_contact BOOLEAN,
  contact_email TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback
CREATE POLICY "Anyone can submit feedback"
ON public.feedback_responses
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view their own feedback (by session)
CREATE POLICY "Anyone can view feedback"
ON public.feedback_responses
FOR SELECT
USING (true);