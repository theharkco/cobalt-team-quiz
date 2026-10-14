ALTER TABLE public.canvas_games
  ADD COLUMN IF NOT EXISTS round_artist_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS used_answers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS words_attempted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rescue_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.canvas_games.masterpiece_index IS 'Pass the Pencil: round (word) number';
COMMENT ON COLUMN public.canvas_games.addition_index IS 'Pass the Pencil: artist turn within the round (1-3)';
COMMENT ON COLUMN public.canvas_games.total_additions IS 'Pass the Pencil: words guessed';
COMMENT ON COLUMN public.canvas_games.last_artist_id IS 'DEPRECATED: replaced by round_artist_ids';

CREATE OR REPLACE FUNCTION public.get_canvas_prompt_for_artist(_game_id uuid, _player_id uuid)
RETURNS TABLE(prompt text, answer text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.prompt, s.answer FROM public.canvas_secrets s
  JOIN public.canvas_games g ON g.id = s.game_id
  WHERE s.game_id = _game_id AND g.phase = 'drawing'
    AND (g.current_artist_id = _player_id OR _player_id = ANY(g.round_artist_ids));
$$;
GRANT EXECUTE ON FUNCTION public.get_canvas_prompt_for_artist(uuid, uuid) TO anon, authenticated;