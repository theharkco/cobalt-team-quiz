ALTER TABLE public.custom_quiz_questions
  ADD COLUMN IF NOT EXISTS audio_preview_url TEXT,
  ADD COLUMN IF NOT EXISTS track_name TEXT,
  ADD COLUMN IF NOT EXISTS artist_name TEXT;