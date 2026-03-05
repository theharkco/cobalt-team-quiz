
CREATE OR REPLACE FUNCTION public.validate_answer_timing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.time_taken_ms > 16000 THEN
    RAISE EXCEPTION 'Answer submitted too late (% ms)', NEW.time_taken_ms;
  END IF;
  RETURN NEW;
END;
$$;
