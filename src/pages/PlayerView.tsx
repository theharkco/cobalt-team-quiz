import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_QUESTIONS, checkAnswer, calculateScore } from '@/data/questions';
import type { Player, QuizSession } from '@/types/quiz';
import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import PlayerAnswerInput from '@/components/quiz/PlayerAnswerInput';
import CountdownTimer from '@/components/quiz/CountdownTimer';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import { useTimer } from '@/hooks/useTimer';
import { retryOnce } from '@/lib/retryAsync';
import { toast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { playCorrect, playWrong, startTicking, stopTicking } from '@/lib/sounds';

export default function PlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [preCountdown, setPreCountdown] = useState(0);
  const preCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timer = useTimer();

  const refreshPlayer = useCallback(async () => {
    if (!playerId) return;
    const { data } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (data) setPlayer(data as Player);
  }, [playerId]);

  const refreshPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false });
    if (data) setPlayers(data as Player[]);
  }, [sessionId]);

  const handleSessionTransition = useCallback((prev: QuizSession | null, next: QuizSession) => {
    // New question started
    if (prev && next.current_question !== prev.current_question) {
      setAnswered(false);
      setLastResult(null);
      // Use server timestamp for timing sync, fallback to local
      const serverStart = next.question_started_at ? new Date(next.question_started_at).getTime() : Date.now();
      timer.start(serverStart);
      startTicking(() => (15000 - (Date.now() - (next.question_started_at ? new Date(next.question_started_at).getTime() : timer.startTimeRef.current))) / 1000);
    }
    // Transition to leaderboard or finished
    if (next.status === 'leaderboard' || next.status === 'finished') {
      timer.stop();
      stopTicking();
      refreshPlayer();
      refreshPlayers();
    }
  }, [timer, refreshPlayer, refreshPlayers]);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      const { data } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).single();
      if (data) setSession(data as QuizSession);
    };
    loadSession();
    refreshPlayer();
    refreshPlayers();

    const channel = supabase
      .channel(`player-${playerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, (payload) => {
        const newSession = payload.new as QuizSession;
        if (!newSession || newSession.id !== sessionId) return;
        setSession(prev => {
          handleSessionTransition(prev, newSession);
          return newSession;
        });
      })
      .subscribe();

    // Polling fallback
    const pollInterval = setInterval(async () => {
      const { data } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).single();
      if (data) {
        const s = data as QuizSession;
        setSession(prev => {
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
    };
  }, [sessionId, playerId]);

  const handleSubmitAnswer = async (answer: string) => {
    if (!session || !player || answered) return;
    const question = QUIZ_QUESTIONS[session.current_question];
    if (!question) return;

    const serverStart = session.question_started_at ? new Date(session.question_started_at).getTime() : timer.startTimeRef.current;
    const timeTaken = Date.now() - serverStart;
    const isCorrect = checkAnswer(question, answer);
    const points = calculateScore(isCorrect, timeTaken);

    setAnswered(true);
    setLastResult({ correct: isCorrect, points });
    timer.stop();
    stopTicking();

    if (isCorrect) {
      playCorrect();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#4ECDC4', '#45B7D1', '#FFEAA7'] });
    } else {
      playWrong();
    }

    try {
      await retryOnce(() =>
        supabase.from('answers').insert({
          player_id: player.id,
          session_id: session.id,
          question_index: session.current_question,
          answer,
          is_correct: isCorrect,
          time_taken_ms: timeTaken,
          points_earned: points,
        }).then(({ error }) => { if (error) throw error; })
      );

      const newScore = player.score + points;
      await retryOnce(() =>
        supabase.from('players').update({ score: newScore }).eq('id', player.id)
          .then(({ error }) => { if (error) throw error; })
      );
      setPlayer(prev => prev ? { ...prev, score: newScore } : null);
    } catch (err) {
      console.error('Failed to save answer:', err);
      toast({ title: 'Connection issue', description: 'Your answer may not have been saved. Don\'t worry, it\'ll sync up!', variant: 'destructive' });
    }
  };

  const onTimerComplete = () => {
    if (!answered) {
      setAnswered(true);
      setLastResult({ correct: false, points: 0 });
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
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">You're in!</h2>
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-6">
        <div className="absolute top-4 right-4">
          <CountdownTimer duration={15} onComplete={onTimerComplete} isRunning={timer.isRunning} size={70} />
        </div>
        <div className="absolute top-4 left-4 bg-card rounded-xl px-3 py-1">
          <span className="font-display font-bold text-primary text-sm">{player?.score ?? 0} pts</span>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg mt-16">
          <QuestionDisplay
            question={currentQ}
            questionNumber={session.current_question + 1}
            totalQuestions={QUIZ_QUESTIONS.length}
            timeElapsedMs={timer.timeElapsed}
          />

          {answered && lastResult ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className={`text-center p-6 rounded-2xl ${lastResult.correct ? 'bg-quiz-green/20' : 'bg-destructive/20'}`}
            >
              <span className="text-5xl block mb-2">{lastResult.correct ? '🎉' : '😅'}</span>
              <p className="text-xl font-display font-bold text-foreground">
                {lastResult.correct ? `+${lastResult.points} points!` : 'Wrong answer!'}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">Waiting for results...</p>
            </motion.div>
          ) : (
            <PlayerAnswerInput
              question={currentQ}
              onSubmit={handleSubmitAnswer}
              disabled={answered}
            />
          )}
        </div>
      </div>
    );
  }

  // LEADERBOARD
  if (session.status === 'leaderboard') {
    const rank = players.findIndex(p => p.id === playerId) + 1;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <FloatingShapes />
        <div className="relative z-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
            <span className="text-6xl block mb-4">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '📊'}</span>
            <h2 className="text-4xl font-display font-bold text-foreground mb-2">
              #{rank}
            </h2>
            <p className="text-2xl font-display font-bold text-primary">{player?.score ?? 0} points</p>
            <p className="text-muted-foreground mt-4 animate-pulse">Next question coming up...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // FINISHED
  if (session.status === 'finished') {
    const rank = players.findIndex(p => p.id === playerId) + 1;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <FloatingShapes />
        <div className="relative z-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
            <span className="text-8xl block mb-4 animate-bounce-in">{rank === 1 ? '🏆' : '🎉'}</span>
            <h2 className="text-4xl font-display font-bold text-foreground mb-2">
              {rank === 1 ? 'You Won!' : `#${rank} Place!`}
            </h2>
            <p className="text-3xl font-display font-bold text-primary mb-4">{player?.score ?? 0} points</p>
            <p className="text-muted-foreground">Thanks for playing! 🎮</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
