
-- Custom quizzes table
CREATE TABLE public.custom_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom quiz questions table
CREATE TABLE public.custom_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.custom_quizzes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'multiple-choice',
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  acceptable_answers JSONB,
  image_url TEXT,
  blur_levels JSONB,
  spotify_embed_url TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'medium',
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add quiz_id to quiz_sessions (nullable, null = default quiz)
ALTER TABLE public.quiz_sessions ADD COLUMN quiz_id UUID REFERENCES public.custom_quizzes(id);

-- Enable RLS
ALTER TABLE public.custom_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies (public quiz app, no auth)
CREATE POLICY "Anyone can read quizzes" ON public.custom_quizzes FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can create quizzes" ON public.custom_quizzes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update quizzes" ON public.custom_quizzes FOR UPDATE TO anon USING (true);
CREATE POLICY "Anyone can delete quizzes" ON public.custom_quizzes FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can read quiz questions" ON public.custom_quiz_questions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can create quiz questions" ON public.custom_quiz_questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update quiz questions" ON public.custom_quiz_questions FOR UPDATE TO anon USING (true);
CREATE POLICY "Anyone can delete quiz questions" ON public.custom_quiz_questions FOR DELETE TO anon USING (true);

-- Enable realtime for custom quizzes
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_quizzes;
