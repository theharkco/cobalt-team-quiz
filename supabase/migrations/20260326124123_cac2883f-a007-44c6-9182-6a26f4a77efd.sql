CREATE OR REPLACE FUNCTION public.validate_answer_timing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.time_taken_ms > 61000 THEN
    RAISE EXCEPTION 'Answer submitted too late (% ms)', NEW.time_taken_ms;
  END IF;
  RETURN NEW;
END;
$function$;