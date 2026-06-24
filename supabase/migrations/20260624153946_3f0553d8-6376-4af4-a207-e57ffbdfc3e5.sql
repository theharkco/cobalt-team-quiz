
ALTER TABLE public.custom_quiz_questions
  ADD COLUMN IF NOT EXISTS lowbrow_question text,
  ADD COLUMN IF NOT EXISTS highbrow_input_type text,
  ADD COLUMN IF NOT EXISTS lowbrow_input_type text,
  ADD COLUMN IF NOT EXISTS lowbrow_options jsonb;
