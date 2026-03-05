
ALTER TABLE public.quiz_sessions ADD COLUMN question_started_at timestamp with time zone DEFAULT NULL;

-- Trigger to reject late answers (> 16s to allow 1s network grace)
CREATE OR REPLACE FUNCTION public.validate_answer_timing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.time_taken_ms > 16000 THEN
    RAISE EXCEPTION 'Answer submitted too late (% ms)', NEW.time_taken_ms;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_answer_timing
  BEFORE INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_answer_timing();
