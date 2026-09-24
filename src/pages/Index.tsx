import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';
import { ArrowLeft, ArrowRight, Gamepad2, PenTool, Radio, Sparkles } from 'lucide-react';

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

  const inputCls = 'w-full min-w-0 border-0 bg-transparent px-0 py-3 font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/35';

  return (
    <main className="quiz-screen flex min-h-screen items-center px-5 py-20 md:px-10">
      <div className="stage-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
        <motion.header
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="space-y-6"
        >
          <p className="stage-kicker flex items-center gap-3">
            <span className="status-dot" /> Live team quiz
          </p>
          <h1 className="max-w-3xl font-display text-[clamp(4.5rem,11vw,9rem)] font-bold leading-[0.78]">
            QUIZ<br/><span className="text-primary">CLASH</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">The room is the arena. One screen hosts, every phone plays.</p>
          <div className="hidden items-center gap-8 border-t border-border pt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground lg:flex"><span>01 Join</span><span>02 Play</span><span>03 Claim glory</span></div>
        </motion.header>
        <div className="space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, type: 'spring', bounce: 0.3 }}
          className="stage-panel overflow-hidden rounded-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><span className="stage-kicker">Player entry</span><span className="flex items-center gap-2 text-xs font-bold text-secondary"><Radio className="h-4 w-4"/> LIVE</span></div>
          <div className="p-5 md:p-7">
          {!codeOk ? (
            <>
              <p className="mb-6 font-display text-2xl font-bold">Enter the four-digit game code</p>
              <div className="flex items-end gap-4 border-b-2 border-input focus-within:border-primary">
                <input
                  id="pin"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
                  placeholder="••••"
                  inputMode="numeric"
                  maxLength={4}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                  className={`${inputCls} tracking-[0.32em]`}
                />
                <Button onClick={handleCheckCode} disabled={loading || joinCode.length !== 4} size="icon" className="mb-3 h-12 w-12 shrink-0"><ArrowRight /></Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label htmlFor="name" className="stage-kicker">
                  Game <span className="text-primary">{joinCode}</span> found
                </label>
                <Button variant="ghost" size="sm"
                  onClick={() => { setCodeOk(false); setError(null); }}
                  className="gap-1"
                >
                  <ArrowLeft /> Change
                </Button>
              </div>
              <p className="mb-4 mt-5 font-display text-2xl font-bold">What should we call your team?</p>
              <div className="flex items-end gap-4 border-b-2 border-input focus-within:border-primary">
                <input
                  id="name"
                  value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
                  placeholder="Your team name"
                  autoFocus
                  maxLength={24}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className={`${inputCls} text-2xl`}
                />
                <Button onClick={handleJoin} disabled={loading || !playerName.trim()} size="icon" className="mb-3 h-12 w-12 shrink-0"><ArrowRight /></Button>
              </div>
            </>
          )}

          {error && <p className="mt-4 text-destructive font-semibold text-sm animate-shake">{error}</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16, type: 'spring', bounce: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button onClick={() => setShowPicker(true)} disabled={loading} variant="outline" className="h-auto justify-start gap-3 p-4 text-left"><Gamepad2 className="h-5 w-5 text-accent"/><span><b className="block">Host a game</b><small className="font-normal text-muted-foreground">Big screen mode</small></span></Button>
          <Button onClick={() => navigate('/create')} variant="outline" className="h-auto justify-start gap-3 p-4 text-left"><PenTool className="h-5 w-5 text-secondary"/><span><b className="block">Make a quiz</b><small className="font-normal text-muted-foreground">Build your own</small></span></Button>
        </motion.div>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5"/> Fast, live and built for teams</p>
        </div>
      </div>
    </main>
  );
};

export default Index;
