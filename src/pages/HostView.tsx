import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS } from '@/data/questions';
import type { Player, QuizSession, SessionStatus } from '@/types/quiz';
import { useTimer } from '@/hooks/useTimer';
import { retryOnce } from '@/lib/retryAsync';
import { toast } from '@/hooks/use-toast';
import CountdownTimer from '@/components/quiz/CountdownTimer';
import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import Leaderboard from '@/components/quiz/Leaderboard';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import { Button } from '@/components/ui/button';

export default function HostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [previousScores, setPreviousScores] = useState<Record<string, number>>({});
  const [answerCount, setAnswerCount] = useState(0);
  const timer = useTimer();

  const refreshPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false });
    if (data) setPlayers(data as Player[]);
  }, [sessionId]);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).single();
    if (data) setSession(data as QuizSession);
  }, [sessionId]);

  const refreshAnswerCount = useCallback(async (questionIndex: number) => {
    if (!sessionId) return;
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('question_index', questionIndex);
    setAnswerCount(count ?? 0);
  }, [sessionId]);

  // Auto-skip timer when all players have answered
  useEffect(() => {
    if (session?.status === 'question' && timer.isRunning && players.length > 0 && answerCount >= players.length) {
      timer.stop();
      setShowAnswer(true);
    }
  }, [answerCount, players.length, session?.status, timer.isRunning]);

  useEffect(() => {
    refreshSession();
    refreshPlayers();

    const channel = supabase
      .channel(`host-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, (payload) => {
        const row = payload.new as QuizSession;
        if (row && row.id === sessionId) setSession(row);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, (payload) => {
        const row = payload.new as Player;
        if (row && row.session_id === sessionId) refreshPlayers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, (payload) => {
        const row = payload.new as Player;
        if (row && row.session_id === sessionId) refreshPlayers();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` }, () => {
        // New answer came in — refresh count
        if (session?.current_question !== undefined && session.current_question >= 0) {
          refreshAnswerCount(session.current_question);
        }
      })
      .subscribe();

    const pollInterval = setInterval(() => { refreshPlayers(); }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      timer.cleanup();
    };
  }, [sessionId]);

  const updateStatus = async (status: SessionStatus, q?: number) => {
    if (!sessionId) return;
    const update: Record<string, unknown> = { status };
    if (q !== undefined) update.current_question = q;
    if (status === 'question') update.question_started_at = new Date().toISOString();

    // Optimistic update
    setSession(prev => prev ? { ...prev, status, ...(q !== undefined ? { current_question: q } : {}), ...(status === 'question' ? { question_started_at: update.question_started_at as string } : {}) } : prev);

    try {
      await retryOnce(() =>
        supabase.from('quiz_sessions').update(update).eq('id', sessionId)
          .then(({ error }) => { if (error) throw error; })
      );
    } catch (err) {
      console.error('Failed to update session:', err);
      toast({ title: 'Connection issue', description: 'Failed to update quiz state. Retrying...', variant: 'destructive' });
      refreshSession(); // revert optimistic update
    }
  };

  const startQuiz = async () => {
    setPreviousScores({});
    setAnswerCount(0);
    await updateStatus('question', 0);
    timer.start();
    setShowAnswer(false);
  };

  const onTimerComplete = () => {
    timer.stop();
    setShowAnswer(true);
  };

  const showLeaderboard = async () => {
    const prev: Record<string, number> = {};
    players.forEach(p => { prev[p.id] = p.score; });
    await refreshPlayers();
    setPreviousScores(prev);
    await updateStatus('leaderboard');
  };

  const nextQuestion = async () => {
    if (!session) return;
    const next = session.current_question + 1;
    if (next >= QUIZ_QUESTIONS.length) {
      await updateStatus('finished');
      await refreshPlayers();
    } else {
      await updateStatus('question', next);
      timer.start();
      setShowAnswer(false);
    }
  };

  const currentQ = session && session.current_question >= 0 ? QUIZ_QUESTIONS[session.current_question] : null;

  // LOBBY
  if (!session || session.status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <FloatingShapes />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
          <motion.h1
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-display font-bold text-gradient"
          >
            Quiz Clash
          </motion.h1>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="bg-card border-2 border-border rounded-2xl p-6 text-center w-full"
          >
            <p className="text-muted-foreground font-body mb-2">Join code:</p>
            <p className="text-6xl md:text-8xl font-display font-bold text-primary tracking-[0.3em]">
              {session?.join_code || '----'}
            </p>
          </motion.div>

          <div className="w-full">
            <p className="text-muted-foreground font-body text-center mb-3">
              👥 {players.length} player{players.length !== 1 ? 's' : ''} joined
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', bounce: 0.6 }}
                    className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: p.color }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-body font-bold text-foreground">{p.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {players.length >= 1 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Button
                onClick={startQuiz}
                className="h-16 px-12 text-xl font-display font-bold rounded-2xl gradient-fun text-foreground border-none hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
              >
                🚀 Start Quiz!
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // QUESTION
  if (session.status === 'question' && currentQ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
        <div className="absolute top-6 right-6">
          <CountdownTimer
            duration={15}
            onComplete={onTimerComplete}
            isRunning={timer.isRunning}
            size={100}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-4xl">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={QUIZ_QUESTIONS.length}
            isHost
            timeElapsedMs={timer.timeElapsed}
          />

          {showAnswer && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-center mt-4"
            >
              <div className="bg-card border-2 border-quiz-green rounded-2xl p-6 inline-block">
                <p className="text-muted-foreground font-body mb-1">Correct answer:</p>
                <p className="text-3xl font-display font-bold text-quiz-green">{currentQ.correctAnswer}</p>
              </div>
              <div className="mt-6">
                <Button
                  onClick={showLeaderboard}
                  className="h-14 px-10 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
                >
                  📊 Show Leaderboard
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // LEADERBOARD
  if (session.status === 'leaderboard') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
        <FloatingShapes />
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">
          <Leaderboard players={players} previousScores={previousScores} />
          <Button
            onClick={nextQuestion}
            className="h-14 px-10 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
          >
            {session.current_question + 1 >= QUIZ_QUESTIONS.length ? '🏆 Final Results' : '➡️ Next Question'}
          </Button>
        </div>
      </div>
    );
  }

  // FINISHED
  if (session.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
        <FloatingShapes />
        <div className="relative z-10 w-full max-w-2xl">
          <Leaderboard players={players} isFinal />
        </div>
      </div>
    );
  }

  return null;
}
