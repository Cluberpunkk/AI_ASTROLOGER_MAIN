-- Make feedback columns nullable for streamlined 1-minute form
ALTER TABLE public.feedback_responses 
  ALTER COLUMN astrology_familiarity DROP NOT NULL,
  ALTER COLUMN understanding_rating DROP NOT NULL,
  ALTER COLUMN clarity_rating DROP NOT NULL,
  ALTER COLUMN guidance_type DROP NOT NULL,
  ALTER COLUMN ease_of_use_rating DROP NOT NULL,
  ALTER COLUMN response_speed DROP NOT NULL,
  ALTER COLUMN got_what_needed DROP NOT NULL,
  ALTER COLUMN likelihood_use_again DROP NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.feedback_responses IS 'Streamlined 1-minute feedback form - captures satisfaction, intent, accuracy, tone, issues, NPS, and open feedback';