-- Infinite Canvas: co-op drawing game mode
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'quiz';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS draw_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS canvas_score integer NOT NULL DEFAULT 0;

CREATE TABLE public.canvas_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'lobby',
  duration_seconds integer NOT NULL DEFAULT 720,
  game_ends_at timestamptz,
  team_score integer NOT NULL DEFAULT 0,
  masterpiece_index integer NOT NULL DEFAULT 1,
  addition_index integer NOT NULL DEFAULT 1,
  current_artist_id uuid,
  last_artist_id uuid,
  phase text NOT NULL DEFAULT 'idle',
  addition_started_at timestamptz,
  addition_seconds integer NOT NULL DEFAULT 35,
  revealed_answer text,
  last_result text,
  last_points integer NOT NULL DEFAULT 0,
  scene jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_additions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.canvas_games TO anon, authenticated;
GRANT ALL ON public.canvas_games TO service_role;
ALTER TABLE public.canvas_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read canvas games" ON public.canvas_games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create canvas games" ON public.canvas_games FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update canvas games" ON public.canvas_games FOR UPDATE TO anon, authenticated USING (true);

CREATE TABLE public.canvas_strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.canvas_games(id) ON DELETE CASCADE,
  masterpiece_index integer NOT NULL,
  addition_index integer NOT NULL,
  artist_id uuid NOT NULL,
  color text NOT NULL,
  width real NOT NULL DEFAULT 0.008,
  points jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX canvas_strokes_game_mp_idx ON public.canvas_strokes(game_id, masterpiece_index);
GRANT SELECT, INSERT, DELETE ON public.canvas_strokes TO anon, authenticated;
GRANT ALL ON public.canvas_strokes TO service_role;
ALTER TABLE public.canvas_strokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read strokes" ON public.canvas_strokes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add strokes" ON public.canvas_strokes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can remove strokes" ON public.canvas_strokes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.canvas_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.canvas_games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  masterpiece_index integer NOT NULL,
  addition_index integer NOT NULL,
  guess text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  points_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.canvas_guesses TO anon, authenticated;
GRANT ALL ON public.canvas_guesses TO service_role;
ALTER TABLE public.canvas_guesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read guesses" ON public.canvas_guesses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add guesses" ON public.canvas_guesses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update guesses" ON public.canvas_guesses FOR UPDATE TO anon, authenticated USING (true);

CREATE TABLE public.canvas_masterpieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.canvas_games(id) ON DELETE CASCADE,
  masterpiece_index integer NOT NULL,
  scene jsonb NOT NULL DEFAULT '[]'::jsonb,
  additions integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  image_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.canvas_masterpieces TO anon, authenticated;
GRANT ALL ON public.canvas_masterpieces TO service_role;
ALTER TABLE public.canvas_masterpieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read masterpieces" ON public.canvas_masterpieces FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can save masterpieces" ON public.canvas_masterpieces FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Secret prompts: no direct table access; only via functions below.
CREATE TABLE public.canvas_secrets (
  game_id uuid PRIMARY KEY REFERENCES public.canvas_games(id) ON DELETE CASCADE,
  host_token text NOT NULL,
  prompt text,
  answer text,
  alternates jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT ALL ON public.canvas_secrets TO service_role;
ALTER TABLE public.canvas_secrets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_canvas_prompt(_game_id uuid, _host_token text, _prompt text, _answer text, _alternates jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing text;
BEGIN
  SELECT host_token INTO existing FROM public.canvas_secrets WHERE game_id = _game_id;
  IF existing IS NULL THEN
    INSERT INTO public.canvas_secrets(game_id, host_token, prompt, answer, alternates)
    VALUES (_game_id, _host_token, _prompt, _answer, COALESCE(_alternates, '[]'::jsonb));
    RETURN true;
  ELSIF existing = _host_token THEN
    UPDATE public.canvas_secrets SET prompt = _prompt, answer = _answer, alternates = COALESCE(_alternates, '[]'::jsonb)
    WHERE game_id = _game_id;
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.get_canvas_prompt_for_artist(_game_id uuid, _player_id uuid)
RETURNS TABLE(prompt text, answer text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.prompt, s.answer FROM public.canvas_secrets s
  JOIN public.canvas_games g ON g.id = s.game_id
  WHERE s.game_id = _game_id AND g.current_artist_id = _player_id AND g.phase = 'drawing';
$$;

CREATE OR REPLACE FUNCTION public.get_canvas_prompt_for_host(_game_id uuid, _host_token text)
RETURNS TABLE(prompt text, answer text, alternates jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.prompt, s.answer, s.alternates FROM public.canvas_secrets s
  WHERE s.game_id = _game_id AND s.host_token = _host_token;
$$;

GRANT EXECUTE ON FUNCTION public.set_canvas_prompt(uuid, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_canvas_prompt_for_artist(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_canvas_prompt_for_host(uuid, text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_strokes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_guesses;
