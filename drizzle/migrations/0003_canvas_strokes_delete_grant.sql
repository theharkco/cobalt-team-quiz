GRANT DELETE ON public.canvas_strokes TO anon, authenticated;
ALTER TABLE public.canvas_strokes REPLICA IDENTITY FULL;