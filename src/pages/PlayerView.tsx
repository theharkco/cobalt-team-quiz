import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS, checkAnswer, calculateScore, checkSelectWrongAnswer, calculateSelectWrongScore } from '@/data/questions';
import type { QuizQuestion } from '@/data/questionTypes';
import type { Player, QuizSession } from '@/types/quiz';
import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import PlayerAnswerInput from '@/components/quiz/PlayerAnswerInput';
import CountdownTimer from '@/components/quiz/CountdownTimer';
import PreCountdownOverlay from '@/components/quiz/PreCountdownOverlay';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import Leaderboard from '@/components/quiz/Leaderboard';
import { useTimer } from '@/hooks/useTimer';
import { usePreCountdown } from '@/hooks/usePreCountdown';
import { retryOnce } from '@/lib/retryAsync';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Emoji from '@/components/quiz/Emoji';
import confetti from 'canvas-confetti';
import { playCorrect, playWrong, startTicking, stopTicking } from '@/lib/sounds';

type ResultKind = 'exact' | 'close' | 'wrong' | 'timeout';

export default function PlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [resultKind, setResultKind] = useState<ResultKind>('timeout');
  const [customQuestions, setCustomQuestions] = useState<QuizQuestion[] | null>(null);
  const timer = useTimer();
  const { preCountdown, startPreCountdown, clearPreCountdown } = usePreCountdown();
  const lastQuestionRef = useRef(-1);

  const quizQuestions = customQuestions || QUIZ_QUESTIONS;

  const refreshPlayer = useCallback(async () => {
    if (!playerId) return;
    const { data, error } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (error) {
      console.error('Failed to load player:', error);
      toast({ title: 'Connection issue', description: 'Failed to load player data.', variant: 'destructive' });
      return;
    }
    if (data) setPlayer(data as Player);
  }, [playerId]);

  const refreshPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });
    if (error) {
      console.error('Failed to load players:', error);
      return;
    }
    if (data) setPlayers(data as Player[]);
  }, [sessionId]);

  const handleSessionTransition = useCallback(
    (prev: QuizSession | null, next: QuizSession) => {
      // New question transition
      if (prev && next.current_question !== prev.current_question && next.current_question !== lastQuestionRef.current) {
        lastQuestionRef.current = next.current_question;
        setAnswered(false);
        setLastPoints(0);
        setResultKind('timeout');
        timer.stop();
        stopTicking();
        clearPreCountdown();

        // Use the unified usePreCountdown hook
        startPreCountdown(() => {
          // After pre-countdown, sync to server timestamp if available,
          // otherwise fall back to now (host hasn't set it yet)
          // Re-read session from state to get the latest question_started_at
          setSession((currentSession) => {
            const serverStart = currentSession?.question_started_at
              ? new Date(currentSession.question_started_at).getTime()
              : Date.now();
            timer.start(serverStart);
            startTicking(() => {
              const elapsed = Date.now() - serverStart;
              return Math.max(0, (15000 - elapsed) / 1000);
            });
            return currentSession;
          });
        });
      }

      if (next.status === 'leaderboard' || next.status === 'finished') {
        timer.stop();
        stopTicking();
        clearPreCountdown();
        refreshPlayer();
        refreshPlayers();
      }
    },
    [timer, refreshPlayer, refreshPlayers, clearPreCountdown, startPreCountdown]
  );

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      const { data, error } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).single();
      if (error) {
        console.error('Failed to load session:', error);
        toast({ title: 'Error', description: 'Could not load quiz session. Check the link.', variant: 'destructive' });
        return;
      }
      if (data) {
        const s = data as QuizSession & { quiz_id?: string };
        setSession(s);

        // Load custom questions if quiz_id exists
        if (s.quiz_id) {
          const { data: qData } = await supabase
            .from('custom_quiz_questions')
            .select('*')
            .eq('quiz_id', s.quiz_id)
            .order('sort_order');
          if (qData && qData.length > 0) {
            setCustomQuestions(
              qData.map((q: Record<string, unknown>, index: number) => ({
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
              }))
            );
          }
        }

        // If we join mid-question, start the timer synced to server
        if (s.status === 'question' && s.question_started_at && s.current_question >= 0) {
          lastQuestionRef.current = s.current_question;
          const serverStart = new Date(s.question_started_at).getTime();
          const elapsed = Date.now() - serverStart;
          if (elapsed < 15000) {
            timer.start(serverStart);
            startTicking(() => Math.max(0, (15000 - (Date.now() - serverStart)) / 1000));
          }
        }
      }
    };
    loadSession();
    refreshPlayer();
    refreshPlayers();

    const channel = supabase
      .channel(`player-${playerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, (payload) => {
        const newSession = payload.new as QuizSession;
        if (!newSession || newSession.id !== sessionId) return;
        setSession((prev) => {
          handleSessionTransition(prev, newSession);
          return newSession;
        });
      })
      .subscribe();

    const pollInterval = setInterval(async () => {
      const { data } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).single();
      if (data) {
        const s = data as QuizSession;
        setSession((prev) => {
          if (prev && (prev.status !== s.status || prev.current_question !== s.current_question)) {
            handleSessionTransition(prev, s);
            return s;
          }
          return prev;
        });
      }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      stopTicking();
      timer.cleanup();
      clearPreCountdown();
    };
  }, [sessionId, playerId]);

  const handleSubmitAnswer = async (answer: string) => {
    if (!session || !player || answered) return;
    const question = quizQuestions[session.current_question];
    if (!question) return;

    const serverStart = session.question_started_at
      ? new Date(session.question_started_at).getTime()
      : timer.startTimeRef.current || Date.now();
    const timeTaken = Math.min(Date.now() - serverStart, 15000);
    const mq = checkAnswer(question, answer);
    const isCorrect = mq !== 'none';
    const points = calculateScore(mq, timeTaken);
    const kind: ResultKind = mq === 'exact' ? 'exact' : mq === 'close' ? 'close' : 'wrong';

    await submitResult(answer, isCorrect, points, timeTaken, kind);
  };

  const handleSubmitMultiple = async (answers: string[]) => {
    if (!session || !player || answered) return;
    const question = quizQuestions[session.current_question];
    if (!question || question.type !== 'select-wrong') return;

    const serverStart = session.question_started_at
      ? new Date(session.question_started_at).getTime()
      : timer.startTimeRef.current || Date.now();
    const timeTaken = Math.min(Date.now() - serverStart, 15000);

    const result = checkSelectWrongAnswer(question, answers);
    const points = calculateSelectWrongScore(result.wrongFoundCount, result.totalWrongCount, timeTaken);
    const isCorrect = result.match !== 'none';
    const kind: ResultKind = result.match === 'exact' ? 'exact' : result.match === 'close' ? 'close' : 'wrong';

    await submitResult(JSON.stringify(answers), isCorrect, points, timeTaken, kind);
  };

  const submitResult = async (answer: string, isCorrect: boolean, points: number, timeTaken: number, kind: ResultKind) => {
    if (!session || !player) return;

    setAnswered(true);
    setLastPoints(points);
    setResultKind(kind);
    timer.stop();
    stopTicking();

    if (isCorrect) {
      playCorrect();
      confetti({
        particleCount: kind === 'exact' ? 80 : 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4ECDC4', '#45B7D1', '#FFEAA7'],
      });
    } else {
      playWrong();
    }

    try {
      await retryOnce(() =>
        supabase
          .from('answers')
          .insert({
            player_id: player.id,
            session_id: session.id,
            question_index: session.current_question,
            answer,
            is_correct: isCorrect,
            time_taken_ms: timeTaken,
            points_earned: points,
          })
          .then(({ error }) => {
            if (error) throw error;
          })
      );
      const newScore = player.score + points;
      await retryOnce(() =>
        supabase
          .from('players')
          .update({ score: newScore })
          .eq('id', player.id)
          .then(({ error }) => {
            if (error) throw error;
          })
      );
      setPlayer((prev) => (prev ? { ...prev, score: newScore } : null));
    } catch (err) {
      console.error('Failed to save answer:', err);
      toast({ title: 'Connection issue', description: 'Your answer may not have been saved.', variant: 'destructive' });
    }
  };

  const onTimerComplete = () => {
    if (!answered) {
      setAnswered(true);
      setLastPoints(0);
      setResultKind('timeout');
      timer.stop();
      stopTicking();
      playWrong();
    }
  };

  // LOBBY
  if (!session || session.status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <FloatingShapes />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-center"
          >
            <Emoji className="text-8xl mb-4 animate-bounce-in" label="game">🎮</Emoji>
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">You&apos;re in!</h2>
            <p className="text-lg font-body text-muted-foreground">
              Welcome, <span className="text-primary font-bold">{player?.name}</span>
            </p>
            <p className="text-muted-foreground mt-4 animate-pulse">Waiting for host to start...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQ = session.current_question >= 0 ? quizQuestions[session.current_question] : null;

  // QUESTION
  if (session.status === 'question' && currentQ) {
    const isPreCountdown = preCountdown > 0;
    const isCorrectResult = resultKind === 'exact' || resultKind === 'close';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-6">
        {!isPreCountdown && (
          <div className="absolute top-4 right-4">
            <CountdownTimer duration={15} timeElapsed={timer.timeElapsed} onComplete={onTimerComplete} isRunning={timer.isRunning} size={70} />
          </div>
        )}
        <div className="absolute top-4 left-4 bg-card rounded-xl px-3 py-1">
          <span className="font-display font-bold text-primary text-sm">{player?.score ?? 0} pts</span>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg mt-16">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={quizQuestions.length}
            timeElapsedMs={timer.timeElapsed}
            hideOptions={isPreCountdown}
            revealAnswer={answered || timer.timeElapsed >= 15000}
          />

          {isPreCountdown ? (
            <PreCountdownOverlay countdown={preCountdown} question={currentQ} />
          ) : answered ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className={`text-center p-6 rounded-2xl ${isCorrectResult ? 'bg-quiz-green/20' : 'bg-destructive/20'}`}
            >
              <Emoji className="text-5xl mb-2" label="result">
                {resultKind === 'exact' ? '🎉' : resultKind === 'close' ? '👍' : resultKind === 'timeout' ? '⏰' : '💥'}
              </Emoji>
              <p className="text-xl font-display font-bold text-foreground">
                {resultKind === 'exact'
                  ? `+${lastPoints} points!`
                  : resultKind === 'close'
                    ? `Close enough! +${lastPoints} points`
                    : resultKind === 'timeout'
                      ? "Time's up!"
                      : 'Wrong answer!'}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">Waiting for results...</p>
            </motion.div>
          ) : (
            <PlayerAnswerInput question={currentQ} onSubmit={handleSubmitAnswer} onSubmitMultiple={handleSubmitMultiple} disabled={answered} />
          )}
        </div>
      </div>
    );
  }

  // LEADERBOARD
  if (session.status === 'leaderboard') {
    const rank = players.findIndex((p) => p.id === playerId) + 1;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <FloatingShapes />
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <Emoji className="text-6xl mb-4" label="rank">
              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '📊'}
            </Emoji>
            <h2 className="text-4xl font-display font-bold text-foreground mb-2">#{rank}</h2>
            <p className="text-2xl font-display font-bold text-primary">{player?.score ?? 0} points</p>
            <p className="text-muted-foreground mt-4 animate-pulse">Next question coming up...</p>
          </motion.div>
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
            🎮 Play Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
