import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';

const Index = () => {
  const navigate = useNavigate();
  const { createSession, joinSession, findSession, error, setError } = useQuizSession();
  const [showJoin, setShowJoin] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHost = async (questions: QuizQuestion[], quizId?: string) => {
    setLoading(true);
    const session = await createSession();
    if (session) {
      sessionStorage.setItem(`quiz-questions-${session.id}`, JSON.stringify(questions));
      if (quizId) {
        await supabase.from('quiz_sessions').update({ quiz_id: quizId }).eq('id', session.id);
      }
      navigate(`/host/${session.id}`);
    }
    setLoading(false);
  };

  const handleCheckCode = async () => {
    if (joinCode.length !== 4) return;
    setLoading(true);
    setError(null);
    const s = await findSession(joinCode);
    if (s) setCodeOk(true);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    const player = await joinSession(joinCode, playerName);
    if (player) {
      navigate(`/play/${player.session_id}/${player.id}`);
    }
    setLoading(false);
  };

  if (showPicker) {
    return <QuizPicker onSelect={handleHost} onBack={() => setShowPicker(false)} />;
  }

  const tile =
    'tactile flex flex-col items-center justify-center p-6 rounded-2xl text-foreground disabled:opacity-50';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.45 }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tight italic -rotate-2 leading-[0.95] text-foreground">
            QUIZ
            <br />
            <span className="text-gradient">CLASH</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', bounce: 0.35 }}
          className="paper-card p-8 space-y-6 transition-transform hover:-translate-y-1"
        >
          {!codeOk ? (
            <div className="space-y-3">
              <label htmlFor="pin" className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Enter game pin
              </label>
              <div className="flex gap-3">
                <input
                  id="pin"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength={4}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                  className="w-full min-w-0 bg-muted border-[3px] border-foreground rounded-2xl px-5 py-4 text-2xl font-display font-bold tracking-[0.3em] focus:outline-none focus:bg-card placeholder:text-foreground/20"
                />
                <button
                  onClick={handleCheckCode}
                  disabled={loading || joinCode.length !== 4}
                  className="tactile bg-secondary text-secondary-foreground font-display font-bold px-7 rounded-2xl uppercase disabled:opacity-50"
                >
                  {loading ? '…' : 'Join'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="name" className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  Game {joinCode} — your name
                </label>
                <button
                  onClick={() => { setCodeOk(false); setError(null); }}
                  className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Change pin
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  id="name"
                  value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
                  placeholder="e.g. Quizzly Bear"
                  autoFocus
                  maxLength={24}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="w-full min-w-0 bg-muted border-[3px] border-foreground rounded-2xl px-5 py-4 text-xl font-display font-semibold focus:outline-none focus:bg-card placeholder:text-foreground/25"
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || !playerName.trim()}
                  className="tactile bg-secondary text-secondary-foreground font-display font-bold px-7 rounded-2xl uppercase disabled:opacity-50"
                >
                  {loading ? '…' : 'Go'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-destructive font-semibold text-sm ml-1 animate-shake">{error}</p>
          )}

          <div className="flex items-center">
            <div className="flex-grow border-t-2 border-[hsl(var(--rule))]" />
            <span className="mx-4 text-muted-foreground/60 font-display font-semibold text-sm uppercase">Or</span>
            <div className="flex-grow border-t-2 border-[hsl(var(--rule))]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowPicker(true)} disabled={loading} className={`${tile} bg-accent`}>
              <span className="relative w-12 h-12 mb-3 bg-card border-2 border-foreground rounded-lg flex items-center justify-center">
                <span className="absolute w-5 h-5 border-[3px] border-foreground rounded-full" />
                <span className="absolute w-1.5 h-1.5 bg-foreground rounded-full" />
              </span>
              <span className="font-display font-bold uppercase text-sm">Host quiz</span>
            </button>
            <button onClick={() => navigate('/create')} className={`${tile} bg-quiz-orange`}>
              <span className="relative w-12 h-12 mb-3 bg-card border-2 border-foreground rounded-lg flex items-center justify-center">
                <span className="absolute w-1.5 h-6 bg-foreground rounded-full" />
                <span className="absolute w-6 h-1.5 bg-foreground rounded-full" />
              </span>
              <span className="font-display font-bold uppercase text-sm">Create</span>
            </button>
          </div>
        </motion.div>

        <p className="text-center font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">
          Grab a screen, share the pin, play together
        </p>
      </div>
    </div>
  );
};

export default Index;
