import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';

const Index = () => {
  const navigate = useNavigate();
  const { createSession, joinSession, findSession, error, setError } = useQuizSession();
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

  const inputCls =
    'w-full min-w-0 bg-background/60 border border-input rounded-2xl px-5 py-4 text-2xl font-display font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition placeholder:text-muted-foreground/40';
  const goCls =
    'tactile bg-primary text-primary-foreground font-display font-bold px-7 rounded-2xl text-lg disabled:opacity-40 disabled:shadow-none';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-10">
        <motion.header
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="text-center space-y-3"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" /> Live team quiz
          </p>
          <h1 className="text-7xl md:text-8xl font-display font-extrabold leading-[0.85] tracking-tighter">
            Quiz<span className="text-primary">clash</span>
          </h1>
          <p className="text-muted-foreground">One screen hosts. Every phone plays.</p>
        </motion.header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, type: 'spring', bounce: 0.3 }}
          className="paper-card p-6 md:p-7 space-y-4"
        >
          {!codeOk ? (
            <>
              <label htmlFor="pin" className="block text-sm font-semibold text-muted-foreground">
                Game pin
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
                  className={`${inputCls} tracking-[0.4em] text-center`}
                />
                <button onClick={handleCheckCode} disabled={loading || joinCode.length !== 4} className={goCls}>
                  {loading ? '…' : 'Join'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label htmlFor="name" className="text-sm font-semibold text-muted-foreground">
                  Joining game <span className="text-foreground font-bold">{joinCode}</span>
                </label>
                <button
                  onClick={() => { setCodeOk(false); setError(null); }}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Change pin
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  id="name"
                  value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
                  placeholder="Your team name"
                  autoFocus
                  maxLength={24}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className={`${inputCls} text-xl`}
                />
                <button onClick={handleJoin} disabled={loading || !playerName.trim()} className={goCls}>
                  {loading ? '…' : 'Go'}
                </button>
              </div>
            </>
          )}

          {error && <p className="text-destructive font-semibold text-sm animate-shake">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16, type: 'spring', bounce: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => setShowPicker(true)}
            disabled={loading}
            className="group text-left rounded-2xl border border-border bg-card/70 p-5 hover:border-accent/60 hover:bg-card transition disabled:opacity-50"
          >
            <span className="block h-2 w-8 rounded-full bg-accent mb-4 transition-all group-hover:w-12" />
            <span className="block font-display font-bold text-lg">Host a game</span>
            <span className="block text-sm text-muted-foreground">Put it on the big screen</span>
          </button>
          <button
            onClick={() => navigate('/create')}
            className="group text-left rounded-2xl border border-border bg-card/70 p-5 hover:border-secondary/60 hover:bg-card transition"
          >
            <span className="block h-2 w-8 rounded-full bg-secondary mb-4 transition-all group-hover:w-12" />
            <span className="block font-display font-bold text-lg">Make a quiz</span>
            <span className="block text-sm text-muted-foreground">Write your own questions</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
