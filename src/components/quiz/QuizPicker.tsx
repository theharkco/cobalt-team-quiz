import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { QuizQuestion } from '@/data/questionTypes';
import { QUIZ_QUESTIONS } from '@/data/questionData';
import { ArrowLeft, ArrowRight, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import QuizScreen from './QuizScreen';

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
      audioPreviewUrl: (q.audio_preview_url as string | null) || undefined,
      trackName: (q.track_name as string | null) || undefined,
      artistName: (q.artist_name as string | null) || undefined,
      category: (q.category as string | null) || undefined,
      difficulty: (q.difficulty as QuizQuestion['difficulty']) || undefined,
      explanation: (q.explanation as string | null) || undefined,
      timeLimitSeconds: (q.time_limit_seconds as number | null) || 15,
      numericAnswer: (q.type as string) === 'closest-without-going-over'
        ? parseFloat(q.correct_answer as string)
        : undefined,
      lowbrowQuestion: (q.lowbrow_question as string | null) || undefined,
      highbrowInputType: (q.highbrow_input_type as 'multiple-choice' | 'free-text' | null) || undefined,
      lowbrowInputType: (q.lowbrow_input_type as 'multiple-choice' | 'free-text' | null) || undefined,
      lowbrowOptions: (q.lowbrow_options as string[] | null) || undefined,
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
    <QuizScreen eyebrow="Host setup" contentClassName="max-w-5xl px-4 py-10 md:px-8 md:py-16">
      <div className="w-full">
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-6xl font-display font-bold"
        >
          Choose the next showdown.
        </motion.h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Pick a set, put it on the big screen, and bring everyone into the lobby.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">

        {/* Default quiz */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stage-panel group min-h-56 cursor-pointer rounded-lg p-6 transition hover:border-primary/70"
          onClick={() => onSelect(QUIZ_QUESTIONS)}
        >
          <div className="flex h-full flex-col justify-between">
            <div><span className="stage-kicker text-primary">Featured set</span><p className="mt-4 font-display text-3xl font-bold">The Main Event</p><p className="mt-2 text-sm text-muted-foreground">PE, AI, music and curveballs.</p></div>
            <div className="mt-10 flex items-center justify-between border-t border-border pt-4"><span className="text-sm font-bold">{QUIZ_QUESTIONS.length} questions</span><ArrowRight className="text-primary transition-transform group-hover:translate-x-1" /></div>
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
                className="stage-panel group min-h-56 cursor-pointer rounded-lg p-6 transition hover:border-primary/60"
                onClick={() => handleSelectCustom(quiz)}
              >
                <div className="flex h-full flex-col justify-between">
                  <div><span className="stage-kicker">Custom set</span><p className="mt-4 truncate font-display text-2xl font-bold">{quiz.title}</p><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{quiz.description || 'Ready to play.'}</p></div>
                  <div className="mt-8 flex items-center justify-between border-t border-border pt-4"><span className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-secondary"/>{quiz.question_count} questions</span><div className="flex items-center gap-1 shrink-0 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/create/${quiz.id}`); }}
                      aria-label={`Edit ${quiz.title}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                      className="hover:text-destructive" aria-label={`Delete ${quiz.title}`}
                    >
                      <Trash2 />
                    </Button>
                    <ArrowRight className="ml-2 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        </div>

        {/* Create new quiz */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button onClick={onBack} variant="ghost"><ArrowLeft /> Back</Button><Button
          onClick={() => navigate('/create')}
          variant="outline"
          className="h-12"
        >
          <Plus /> Create new quiz
        </Button>
        </div>
      </div>
    </QuizScreen>
  );
}
