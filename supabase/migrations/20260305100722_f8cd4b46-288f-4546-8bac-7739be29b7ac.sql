
-- Create quiz_sessions table
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'question', 'leaderboard', 'finished')),
  current_question INTEGER NOT NULL DEFAULT -1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#FF6B6B',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_taken_ms INTEGER NOT NULL DEFAULT 15000,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, question_index)
);

-- Enable RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Since no auth, allow all operations (anonymous access)
CREATE POLICY "Anyone can create sessions" ON public.quiz_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can read sessions" ON public.quiz_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update sessions" ON public.quiz_sessions FOR UPDATE TO anon USING (true);

CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE TO anon USING (true);

CREATE POLICY "Anyone can insert answers" ON public.answers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can read answers" ON public.answers FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update answers" ON public.answers FOR UPDATE TO anon USING (true);

-- Index for fast lookups
CREATE INDEX idx_players_session ON public.players(session_id);
CREATE INDEX idx_answers_session ON public.answers(session_id);
CREATE INDEX idx_answers_player ON public.answers(player_id);
CREATE INDEX idx_sessions_join_code ON public.quiz_sessions(join_code);
