import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS, checkAnswer, calculateScore } from '@/data/questions';
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
  const timer = useTimer();
  const { preCountdown, startPreCountdown, clearPreCountdown } = usePreCountdown();
  const lastQuestionRef = useRef(-1);

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
          // After pre-countdown, start timer synced to server timestamp
          const serverStart = next.question_started_at
            ? new Date(next.question_started_at).getTime()
            : Date.now();
          timer.start(serverStart);
          startTicking(() => {
            const elapsed = Date.now() - serverStart;
            return Math.max(0, (15000 - elapsed) / 1000);
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
        const s = data as QuizSession;
        setSession(s);
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
    const question = QUIZ_QUESTIONS[session.current_question];
    if (!question) return;

    const serverStart = session.question_started_at
      ? new Date(session.question_started_at).getTime()
      : timer.startTimeRef.current || Date.now();
    const timeTaken = Math.min(Date.now() - serverStart, 15000);
    const mq = checkAnswer(question, answer);
    const isCorrect = mq !== 'none';
    const points = calculateScore(mq, timeTaken);
    const kind: ResultKind = mq === 'exact' ? 'exact' : mq === 'close' ? 'close' : 'wrong';

    setAnswered(true);
    setLastPoints(points);
    setResultKind(kind);
    timer.stop();
    stopTicking();

    if (isCorrect) {
      playCorrect();
      confetti({
        particleCount: mq === 'exact' ? 80 : 40,
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
            <span className="text-8xl block mb-4 animate-bounce-in">🎮</span>
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

  const currentQ = session.current_question >= 0 ? QUIZ_QUESTIONS[session.current_question] : null;

  // QUESTION
  if (session.status === 'question' && currentQ) {
    const isPreCountdown = preCountdown > 0;
    const isCorrectResult = resultKind === 'exact' || resultKind === 'close';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-6">
        {!isPreCountdown && (
          <div className="absolute top-4 right-4">
            <CountdownTimer duration={15} onComplete={onTimerComplete} isRunning={timer.isRunning} size={70} />
          </div>
        )}
        <div className="absolute top-4 left-4 bg-card rounded-xl px-3 py-1">
          <span className="font-display font-bold text-primary text-sm">{player?.score ?? 0} pts</span>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg mt-16">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={QUIZ_QUESTIONS.length}
            timeElapsedMs={timer.timeElapsed}
            hideOptions={isPreCountdown}
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
              <span className="text-5xl block mb-2">
                {resultKind === 'exact' ? '🎉' : resultKind === 'close' ? '👍' : resultKind === 'timeout' ? '⏰' : '😅'}
              </span>
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
            <PlayerAnswerInput question={currentQ} onSubmit={handleSubmitAnswer} disabled={answered} />
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
            <span className="text-6xl block mb-4">
              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '📊'}
            </span>
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
