import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS } from '@/data/questions';
import type { QuizQuestion } from '@/data/questionTypes';
import type { Player, QuizSession, SessionStatus } from '@/types/quiz';
import { useTimer } from '@/hooks/useTimer';
import { usePreCountdown } from '@/hooks/usePreCountdown';
import { retryOnce } from '@/lib/retryAsync';
import { toast } from '@/hooks/use-toast';
import CountdownTimer from '@/components/quiz/CountdownTimer';
import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import PreCountdownOverlay from '@/components/quiz/PreCountdownOverlay';
import Leaderboard from '@/components/quiz/Leaderboard';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import { Button } from '@/components/ui/button';

export default function HostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [previousScores, setPreviousScores] = useState<Record<string, number>>({});
  const [answerCount, setAnswerCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  // Load custom questions from sessionStorage or fall back to defaults
  const quizQuestions = useMemo<QuizQuestion[]>(() => {
    if (!sessionId) return QUIZ_QUESTIONS;
    try {
      const stored = sessionStorage.getItem(`quiz-questions-${sessionId}`);
      if (stored) return JSON.parse(stored) as QuizQuestion[];
    } catch {}
    return QUIZ_QUESTIONS;
  }, [sessionId]);

  const timer = useTimer();
  const { preCountdown, startPreCountdown, clearPreCountdown } = usePreCountdown();

  const refreshPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });
    if (error) {
      console.error('Failed to load players:', error);
      toast({ title: 'Connection issue', description: 'Failed to load players.', variant: 'destructive' });
      return;
    }
    if (data) setPlayers(data as Player[]);
  }, [sessionId]);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (error) {
      console.error('Failed to load session:', error);
      toast({ title: 'Connection issue', description: 'Failed to load quiz session.', variant: 'destructive' });
      return;
    }
    if (data) setSession(data as QuizSession);
  }, [sessionId]);

  // Auto-skip timer when all players have answered
  useEffect(() => {
    if (
      session?.status === 'question' &&
      timer.isRunning &&
      players.length > 0 &&
      answerCount >= players.length
    ) {
      timer.stop();
      setShowAnswer(true);
    }
  }, [answerCount, players.length, session?.status, timer.isRunning]);

  // Mid-question sync: if host reloads while a question is active, resume timer
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: s } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (s) {
        setSession(s as QuizSession);
        if (s.status === 'question' && s.question_started_at && s.current_question >= 0) {
          setCurrentQuestionIndex(s.current_question);
          const serverStart = new Date(s.question_started_at).getTime();
          const elapsed = Date.now() - serverStart;
          if (elapsed < 15000) {
            timer.start(serverStart);
          } else {
            // Timer already expired — show answer
            setShowAnswer(true);
          }
        }
      }
    })();
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` }, (payload) => {
        const answer = payload.new as { question_index: number };
        setCurrentQuestionIndex((curIdx) => {
          if (answer.question_index === curIdx) {
            setAnswerCount((prev) => prev + 1);
          }
          return curIdx;
        });
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      refreshPlayers();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      timer.cleanup();
      clearPreCountdown();
    };
  }, [sessionId]);

  const updateStatus = async (status: SessionStatus, q?: number, extraFields?: Record<string, unknown>) => {
    if (!sessionId) return;
    const update: Record<string, unknown> = { status, ...extraFields };
    if (q !== undefined) update.current_question = q;

    setSession((prev) =>
      prev
        ? {
            ...prev,
            status,
            ...(q !== undefined ? { current_question: q } : {}),
            ...extraFields,
          }
        : prev
    );

    try {
      await retryOnce(() =>
        supabase
          .from('quiz_sessions')
          .update(update)
          .eq('id', sessionId)
          .then(({ error }) => {
            if (error) throw error;
          })
      );
    } catch (err) {
      console.error('Failed to update session:', err);
      toast({ title: 'Connection issue', description: 'Failed to update quiz state. Retrying...', variant: 'destructive' });
      refreshSession();
    }
  };

  const startQuestionWithPreCountdown = (questionIndex: number) => {
    setAnswerCount(0);
    setCurrentQuestionIndex(questionIndex);
    setShowAnswer(false);
    startPreCountdown(async () => {
      // Set question_started_at AFTER the 3s pre-countdown finishes
      const now = new Date().toISOString();
      await supabase
        .from('quiz_sessions')
        .update({ question_started_at: now })
        .eq('id', sessionId!);
      setSession((prev) => prev ? { ...prev, question_started_at: now } : prev);
      timer.start();
    });
  };

  const startQuiz = async () => {
    setPreviousScores({});
    await updateStatus('question', 0, { question_started_at: null });
    startQuestionWithPreCountdown(0);
  };

  const onTimerComplete = () => {
    timer.stop();
    setShowAnswer(true);
  };

  const showLeaderboard = async () => {
    const prev: Record<string, number> = {};
    players.forEach((p) => {
      prev[p.id] = p.score;
    });
    await refreshPlayers();
    setPreviousScores(prev);
    await updateStatus('leaderboard');
  };

  const nextQuestion = async () => {
    if (!session) return;
    const next = session.current_question + 1;
    if (next >= quizQuestions.length) {
      await updateStatus('finished');
      await refreshPlayers();
    } else {
      await updateStatus('question', next, { question_started_at: null });
      startQuestionWithPreCountdown(next);
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
            <p className="text-muted-foreground font-body mb-1 text-sm">Go to</p>
            <p className="text-lg md:text-2xl font-display font-bold text-accent mb-3 select-all">
              {window.location.origin}
            </p>
            <p className="text-muted-foreground font-body mb-2">Enter code:</p>
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
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: p.color }}
                    >
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
    const isPreCountdown = preCountdown > 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
        {!isPreCountdown && (
          <div className="absolute top-6 right-6">
            <CountdownTimer duration={15} timeElapsed={timer.timeElapsed} onComplete={onTimerComplete} isRunning={timer.isRunning} size={100} />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-4xl">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={QUIZ_QUESTIONS.length}
            isHost
            timeElapsedMs={timer.timeElapsed}
            hideOptions={isPreCountdown}
            revealAnswer={showAnswer}
          />

          {isPreCountdown && <PreCountdownOverlay countdown={preCountdown} question={currentQ} />}

          {!isPreCountdown && !showAnswer && (
            <Button
              onClick={onTimerComplete}
              variant="outline"
              className="h-10 px-6 text-sm font-display font-bold rounded-xl border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all"
            >
              ⏭️ Skip Question
            </Button>
          )}


          {showAnswer && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-center mt-4"
            >
              <div className="bg-card border-2 border-quiz-green rounded-2xl p-6 inline-block max-w-lg">
                <p className="text-muted-foreground font-body mb-1">Correct answer:</p>
                <p className="text-3xl font-display font-bold text-quiz-green">{currentQ.correctAnswer}</p>
                {currentQ.explanation && (
                  <p className="text-sm font-body text-muted-foreground mt-3 leading-relaxed">{currentQ.explanation}</p>
                )}
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
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6">
          <Leaderboard players={players} isFinal />
          <Button
            onClick={() => navigate('/')}
            className="h-14 px-10 text-lg font-display font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
          >
            🎮 New Quiz
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
