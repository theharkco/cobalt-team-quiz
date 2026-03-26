import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import type { QuizQuestion } from '@/data/questionTypes';
import { QUIZ_QUESTIONS } from '@/data/questionData';

interface CustomQuiz {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  question_count?: number;
}

interface Props {
  onSelect: (questions: QuizQuestion[], quizId?: string) => void;
  onBack: () => void;
}

export default function QuizPicker({ onSelect, onBack }: Props) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<CustomQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('custom_quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        // Get question counts
        const withCounts = await Promise.all(
          data.map(async (quiz) => {
            const { count } = await supabase
              .from('custom_quiz_questions')
              .select('*', { count: 'exact', head: true })
              .eq('quiz_id', quiz.id);
            return { ...quiz, question_count: count || 0 };
          })
        );
        setQuizzes(withCounts);
      }
      setLoading(false);
    })();
  }, []);

  const handleSelectCustom = async (quiz: CustomQuiz) => {
    const { data } = await supabase
      .from('custom_quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('sort_order');

    if (!data || data.length === 0) return;

    const questions: QuizQuestion[] = data.map((q: Record<string, unknown>, index: number) => ({
      id: index + 1,
      type: q.type as QuizQuestion['type'],
      question: q.question as string,
      options: (q.options as string[] | null) || undefined,
      correctAnswer: q.correct_answer as string,
      acceptableAnswers: (q.acceptable_answers as string[] | null) || undefined,
      correctAnswers: q.type === 'select-wrong' ? ((q.acceptable_answers as string[] | null) || undefined) : undefined,
      imageUrl: (q.image_url as string | null) || undefined,
      blurLevels: (q.blur_levels as number[] | null) || undefined,
      spotifyEmbedUrl: (q.spotify_embed_url as string | null) || undefined,
      category: (q.category as string | null) || undefined,
      difficulty: (q.difficulty as QuizQuestion['difficulty']) || undefined,
      explanation: (q.explanation as string | null) || undefined,
    }));

    onSelect(questions, quiz.id);
  };

  const handleDeleteQuiz = async (e: React.MouseEvent, quizId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this quiz?')) return;
    await supabase.from('custom_quizzes').delete().eq('id', quizId);
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      <FloatingShapes />
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-5xl font-display font-bold text-gradient"
        >
          Pick a Quiz
        </motion.h1>

        {/* Default quiz */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-card border-2 border-primary/30 rounded-2xl p-5 cursor-pointer hover:border-primary/60 transition-all hover:scale-[1.02]"
          onClick={() => onSelect(QUIZ_QUESTIONS)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-foreground text-lg">⚡ Default Quiz</p>
              <p className="text-sm text-muted-foreground font-body">{QUIZ_QUESTIONS.length} questions • PE, AI, Music & more</p>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </motion.div>

        {/* Custom quizzes */}
        {loading ? (
          <p className="text-muted-foreground font-body">Loading quizzes...</p>
        ) : (
          <AnimatePresence>
            {quizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="w-full bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-all hover:scale-[1.02]"
                onClick={() => handleSelectCustom(quiz)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-foreground text-lg truncate">🎯 {quiz.title}</p>
                    <p className="text-sm text-muted-foreground font-body">
                      {quiz.question_count} questions
                      {quiz.description && ` • ${quiz.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/create/${quiz.id}`); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      🗑️
                    </Button>
                    <span className="text-2xl text-muted-foreground">→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Create new quiz */}
        <Button
          onClick={() => navigate('/create')}
          variant="outline"
          className="w-full h-14 text-lg font-display font-bold rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        >
          ➕ Create New Quiz
        </Button>

        <Button onClick={onBack} variant="ghost" className="text-muted-foreground font-body">
          ← Back
        </Button>
      </div>
    </div>
  );
}
