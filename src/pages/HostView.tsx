import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS, calculateClosestWithoutGoingOverScores } from '@/data/questions';
import type { QuizQuestion } from '@/data/questionTypes';
import type { Player, QuizSession, SessionStatus } from '@/types/quiz';
import { useTimer } from '@/hooks/useTimer';
import { usePreCountdown } from '@/hooks/usePreCountdown';
import { retryOnce } from '@/lib/retryAsync';
import { resetForNextQuestion } from '@/lib/questionTransition';
import { toast } from '@/hooks/use-toast';
import CountdownTimer from '@/components/quiz/CountdownTimer';
import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import PreCountdownOverlay from '@/components/quiz/PreCountdownOverlay';
import Leaderboard from '@/components/quiz/Leaderboard';
import { Button } from '@/components/ui/button';
import QuizScreen from '@/components/quiz/QuizScreen';
import QuestionTransitionOverlay from '@/components/quiz/QuestionTransitionOverlay';
import { ArrowRight, BarChart3, FastForward, Play, Radio, Users } from 'lucide-react';

export default function HostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [previousScores, setPreviousScores] = useState<Record<string, number>>({});
  const [answerCount, setAnswerCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [rankedGuesses, setRankedGuesses] = useState<{ playerName: string; guess: number; points: number; over: boolean }[]>([]);
  const [hasScored, setHasScored] = useState(false);
  // Brief full-screen fade shown while a new question hydrates, so the old
  // question never visibly swaps into the new one mid-render.
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Score closest-without-going-over when answer is revealed
  useEffect(() => {
    if (!showAnswer || !session || hasScored) return;
    const q = session.current_question >= 0 ? quizQuestions[session.current_question] : null;
    if (!q || q.type !== 'closest-without-going-over') return;

    const correctNum = q.numericAnswer ?? parseFloat(q.correctAnswer);
    if (isNaN(correctNum)) return;

    setHasScored(true);

    (async () => {
      // Short grace period so a guess submitted right on the buzzer still counts
      await new Promise((r) => setTimeout(r, 500));

      const { data: answers } = await supabase
        .from('answers')
        .select('*')
        .eq('session_id', session.id)
        .eq('question_index', session.current_question);

      if (!answers || answers.length === 0) {
        setRankedGuesses([]);
        return;
      }

      // Guard against double-awarding if the host reloads after the reveal:
      // scored rows already carry their points.
      const alreadyScored =
        answers.some((a) => (a.points_earned ?? 0) > 0) ||
        sessionStorage.getItem(`cwgo-scored-${session.id}-${session.current_question}`) === '1';

      const guesses = answers.map((a) => ({
        playerId: a.player_id,
        answer: parseFloat(a.answer),
        answerId: a.id,
      }));

      const scores = calculateClosestWithoutGoingOverScores(
        guesses.map((g) => ({ playerId: g.playerId, answer: g.answer })),
        correctNum
      );

      const playerMap = new Map(players.map((p) => [p.id, p.name]));
      const ranked = guesses
        .map((g) => ({
          playerName: playerMap.get(g.playerId) || 'Unknown',
          guess: g.answer,
          points: scores.get(g.playerId) || 0,
          over: g.answer > correctNum,
        }))
        .sort((a, b) => {
          if (a.over !== b.over) return a.over ? 1 : -1;
          return b.points - a.points;
        });
      setRankedGuesses(ranked);

      if (alreadyScored) return;
      sessionStorage.setItem(`cwgo-scored-${session.id}-${session.current_question}`, '1');

      try {
        for (const g of guesses) {
          const pts = scores.get(g.playerId) || 0;
          await supabase
            .from('answers')
            .update({ points_earned: pts, is_correct: pts > 0 })
            .eq('id', g.answerId);
        }
        // Read scores fresh from the database so we never add points on top of
        // a stale local value.
        const { data: freshPlayers } = await supabase
          .from('players')
          .select('id, score')
          .eq('session_id', session.id);
        const scoreById = new Map((freshPlayers ?? []).map((p) => [p.id, p.score]));
        for (const g of guesses) {
          const pts = scores.get(g.playerId) || 0;
          const base = scoreById.get(g.playerId);
          if (pts > 0 && base !== undefined) {
            await supabase
              .from('players')
              .update({ score: base + pts })
              .eq('id', g.playerId);
          }
        }
        refreshPlayers();
      } catch (err) {
        console.error('Failed to update scores for closest-without-going-over:', err);
      }
    })();
  }, [showAnswer, session, hasScored, players, quizQuestions, refreshPlayers]);

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
          const qTimeLimit = (quizQuestions[s.current_question]?.timeLimitSeconds ?? 15) * 1000;
          if (elapsed < qTimeLimit) {
            timer.start(serverStart);
          } else {
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

  const updateStatus = async (status: SessionStatus, q?: number, extraFields?: Partial<{ question_started_at: string | null }>) => {
    if (!sessionId) return;
    const update: { status: string; current_question?: number; question_started_at?: string | null } = { status, ...extraFields };
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

  // Everything that must never survive a question swap, in one place.
  const resetQuestionState = useCallback(() => {
    resetForNextQuestion({
      clearRevealState: () => {
        setShowAnswer(false);
        setHasScored(false);
        setRankedGuesses([]);
      },
      timer,
      clearPreCountdown,
      onCleanup: () => setAnswerCount(0),
    });
  }, [timer, clearPreCountdown]);

  const startQuestionWithPreCountdown = (questionIndex: number) => {
    setIsTransitioning(true);
    resetQuestionState();
    setCurrentQuestionIndex(questionIndex);
    // Snapshot scores as the question begins so the leaderboard can show the
    // points won on this question, however they were awarded.
    setPreviousScores(Object.fromEntries(players.map((p) => [p.id, p.score])));
    startPreCountdown(async () => {
      const now = new Date().toISOString();
      await supabase
        .from('quiz_sessions')
        .update({ question_started_at: now })
        .eq('id', sessionId!);
      setSession((prev) => prev ? { ...prev, question_started_at: now } : prev);
      timer.start();
    });
    // Keep the fade up until the new question + countdown have painted.
    window.setTimeout(() => setIsTransitioning(false), 350);
  };

  const startQuiz = async () => {
    resetQuestionState();
    await updateStatus('question', 0, { question_started_at: null });
    startQuestionWithPreCountdown(0);
  };

  const onTimerComplete = () => {
    timer.stop();
    setShowAnswer(true);
  };

  const showLeaderboard = async () => {
    // previousScores was captured when the question started, so the leaderboard
    // animates this question's gains — including host-awarded ones.
    await refreshPlayers();
    await updateStatus('leaderboard');
  };

  const nextQuestion = async () => {
    if (!session) return;
    const next = session.current_question + 1;
    if (next >= quizQuestions.length) {
      await updateStatus('finished');
      await refreshPlayers();
    } else {
      // Cover the swap with a fade BEFORE the async session update so the old
      // question never flickers into the new one while it hydrates.
      setIsTransitioning(true);
      // Reset reveal state BEFORE the session update so the new question
      // never renders momentarily with the previous reveal styling.
      resetQuestionState();
      await updateStatus('question', next, { question_started_at: null });
      startQuestionWithPreCountdown(next);
    }
  };

  const currentQ = session && session.current_question >= 0 ? quizQuestions[session.current_question] : null;

  // LOBBY
  if (!session || session.status === 'lobby') {
    return (
      <QuizScreen eyebrow="Host lobby" corner={<span className="flex items-center gap-2 text-xs font-bold text-secondary"><Radio className="h-4 w-4" /> LIVE</span>} contentClassName="max-w-6xl px-4 py-10 md:px-8 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-stretch">
          <motion.h1
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sr-only"
          >
            Quiz Clash
          </motion.h1>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="stage-panel flex min-h-[440px] flex-col justify-between rounded-lg p-7 md:p-10"
          >
            <div><p className="stage-kicker">Join the game</p><p className="mt-3 select-all break-all text-lg font-semibold text-muted-foreground md:text-2xl">{window.location.origin}</p></div>
            <div><p className="stage-kicker mb-3">Game code</p><p className="font-display text-[clamp(4.5rem,12vw,9rem)] font-bold leading-none tracking-[0.12em] text-primary tabular-nums">{session?.join_code || '----'}</p></div>
            <div className="flex items-center gap-3 border-t border-border pt-5 text-sm text-muted-foreground"><span className="status-dot"/> Waiting for teams to check in</div>
          </motion.div>

          <div className="stage-panel flex min-h-[440px] flex-col rounded-lg">
            <div className="flex items-center justify-between border-b border-border p-5"><p className="font-display text-xl font-bold">Teams in the room</p><span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-bold"><Users className="h-4 w-4 text-secondary"/>{players.length}</span></div>
            <div className="flex flex-1 flex-wrap content-start gap-2 p-5">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', bounce: 0.6 }}
                    className="flex h-11 items-center gap-2 rounded-md border border-border bg-muted/50 px-3"
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-primary-foreground"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-body font-bold text-foreground">{p.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="border-t border-border p-5">
          {players.length >= 1 ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Button
                onClick={startQuiz}
                className="h-14 w-full text-base"
              >
                <Play /> Start the showdown
              </Button>
            </motion.div>
          ) : <p className="text-center text-sm text-muted-foreground">The start control unlocks when the first team arrives.</p>}
            </div>
          </div>
        </div>
      </QuizScreen>
    );
  }

  // QUESTION
  if (session.status === 'question' && currentQ) {
    const isPreCountdown = preCountdown > 0;
    const questionTimeLimit = currentQ.timeLimitSeconds ?? 15;
    return (
      <QuizScreen eyebrow={`Question ${session.current_question + 1} / ${quizQuestions.length}`} corner={!isPreCountdown ? <CountdownTimer duration={questionTimeLimit} timeElapsed={timer.timeElapsed} onComplete={onTimerComplete} isRunning={timer.isRunning} size={46} /> : undefined} contentClassName="max-w-6xl px-4 py-8 md:px-8">
        <AnimatePresence>
          {isTransitioning && (
            <QuestionTransitionOverlay questionNumber={session.current_question + 1} />
          )}
        </AnimatePresence>
        <div className="flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-center gap-6">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={quizQuestions.length}
            isHost
            timeElapsedMs={timer.timeElapsed}
            questionStartedAtMs={session.question_started_at ? new Date(session.question_started_at).getTime() : undefined}
            hideOptions={isPreCountdown}
            revealAnswer={showAnswer}
          />

          {isPreCountdown && <PreCountdownOverlay countdown={preCountdown} question={currentQ} />}

          {!isPreCountdown && !showAnswer && <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-border bg-card/95 p-2 pl-4 shadow-[var(--shadow-ink)] backdrop-blur"><span className="whitespace-nowrap text-sm font-bold text-muted-foreground"><span className="text-foreground">{answerCount}</span> / {players.length} answered</span><Button
              onClick={onTimerComplete}
              variant="outline"
              className="h-10"
            >
              <FastForward /> End question
            </Button>
          </div>}

          {showAnswer && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-full max-w-3xl text-center mt-2"
            >
              <div className="stage-panel border-t-4 border-t-secondary rounded-lg p-6 md:p-8 inline-block w-full">
                {currentQ.type === 'closest-without-going-over' ? (
                  <>
                    <p className="text-muted-foreground font-body mb-1">🎯 The correct number:</p>
                    <p className="text-3xl font-display font-bold text-quiz-green">
                      {currentQ.numericAnswer ?? currentQ.correctAnswer}
                    </p>
                    {rankedGuesses.length > 0 && (
                      <div className="mt-4 space-y-2 text-left">
                        <p className="text-sm text-muted-foreground font-body mb-2">Player guesses:</p>
                        {rankedGuesses.map((g, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body ${
                              g.over
                                ? 'bg-destructive/10 text-destructive'
                                : g.points >= 700
                                  ? 'bg-quiz-green/20 text-quiz-green'
                                  : 'bg-muted text-foreground'
                            }`}
                          >
                            <span className="font-display font-bold">{g.playerName}</span>
                            <span className="flex items-center gap-3">
                              <span className="font-mono">{g.guess}</span>
                              {g.over ? (
                                <span className="text-xs font-bold">OVER ✗</span>
                              ) : (
                                <span className="font-bold text-quiz-green">+{g.points}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : currentQ.type === 'select-wrong' ? (() => {
                  const correctSet = new Set((currentQ.correctAnswers || []).map(a => a.toLowerCase()));
                  const wrongOnes = (currentQ.options || []).filter(o => !correctSet.has(o.toLowerCase()));
                  return (
                    <>
                      <p className="text-muted-foreground font-body mb-1">✅ True statements:</p>
                      <p className="text-xl font-display font-bold text-quiz-green">
                        {currentQ.correctAnswers?.join(', ')}
                      </p>
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-muted-foreground font-body mb-1">❌ Players needed to spot these false ones:</p>
                        <p className="text-lg font-display font-bold text-destructive">
                          {wrongOnes.join(', ')}
                        </p>
                      </div>
                    </>
                  );
                })() : currentQ.type === 'put-in-order' ? (
                  <>
                    <p className="text-muted-foreground font-body mb-2">🔀 Correct order:</p>
                    <ol className="text-xl font-display font-bold text-quiz-green list-decimal list-inside text-left inline-block space-y-1">
                      {(currentQ.options || []).map((opt, i) => (<li key={i}>{opt}</li>))}
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground font-body mb-1">The answer:</p>
                    <p className="text-3xl font-display font-bold text-quiz-green">{currentQ.correctAnswer}</p>
                  </>
                )}
                {currentQ.explanation && (
                  <p className="text-sm font-body text-muted-foreground mt-3 leading-relaxed">{currentQ.explanation}</p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={showLeaderboard}
                  className="h-12 px-7"
                >
                  <BarChart3 /> Show standings
                </Button>
                <Button
                  onClick={nextQuestion}
                  variant="outline"
                  className="h-12 px-7"
                >
                  {session.current_question + 1 >= quizQuestions.length ? 'Final results' : 'Next question'} <ArrowRight />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </QuizScreen>
    );
  }

  // LEADERBOARD
  if (session.status === 'leaderboard') {
    return (
      <QuizScreen eyebrow="Round standings" contentClassName="max-w-3xl px-4 py-10 md:px-8">
        <div className="flex min-h-[calc(100vh-9rem)] w-full flex-col items-center justify-center gap-8">
          <Leaderboard players={players} previousScores={previousScores} />
          <Button
            onClick={nextQuestion}
            className="h-12 px-8"
          >
            {session.current_question + 1 >= quizQuestions.length ? 'Final results' : 'Next question'} <ArrowRight />
          </Button>
        </div>
      </QuizScreen>
    );
  }

  // FINISHED
  if (session.status === 'finished') {
    return (
      <QuizScreen eyebrow="Final results" contentClassName="max-w-4xl px-4 py-10 md:px-8">
        <div className="flex min-h-[calc(100vh-9rem)] w-full flex-col items-center justify-center gap-8">
          <Leaderboard players={players} isFinal />
          <Button
            onClick={() => navigate('/')}
            className="h-12 px-8"
          >
            New game <ArrowRight />
          </Button>
        </div>
      </QuizScreen>
    );
  }

  return null;
}
