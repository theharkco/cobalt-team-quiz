import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PartyBackdrop, { BouncyWord } from '@/components/quiz/PartyBackdrop';
import { Button } from '@/components/ui/button';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';
import { canvasDb } from '@/hooks/useCanvasGame';
import { ArrowLeft, ArrowRight, Gamepad2, Paintbrush, PenTool, Sparkles } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { createSession, joinSession, findSession, error, setError } = useQuizSession();
  const [params, setParams] = useSearchParams();
  const showPicker = params.get('host') === 'quiz';
  const setShowPicker = (v: boolean) => setParams(v ? { host: 'quiz' } : {});
  const [joinCode, setJoinCode] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState('quiz');

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

  const handleHostCanvas = async () => {
    setLoading(true);
    const session = await createSession();
    if (session) {
      const token = crypto.randomUUID();
      sessionStorage.setItem(`canvas-host-${session.id}`, token);
      await canvasDb.from('quiz_sessions').update({ game_mode: 'canvas' }).eq('id', session.id);
      const { data: g } = await canvasDb.from('canvas_games').insert({ session_id: session.id }).select('id').single();
      if (g) await canvasDb.rpc('set_canvas_prompt', { _game_id: (g as { id: string }).id, _host_token: token, _prompt: null, _answer: null, _alternates: [] });
      navigate(`/canvas-host/${session.id}`);
    }
    setLoading(false);
  };

  const handleCheckCode = async () => {
    if (joinCode.length !== 4) return;
    setLoading(true);
    setError(null);
    const s = await findSession(joinCode);
    if (s) {
      setCodeOk(true);
      setGameMode((s as { game_mode?: string }).game_mode ?? 'quiz');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    const player = await joinSession(joinCode, playerName);
    if (player) {
      navigate(gameMode === 'canvas' ? `/canvas/${player.session_id}/${player.id}` : `/play/${player.session_id}/${player.id}`);
    }
    setLoading(false);
  };

  if (showPicker) {
    return <QuizPicker onSelect={handleHost} onBack={() => setShowPicker(false)} />;
  }

  const inputCls = 'w-full min-w-0 border-0 bg-transparent px-0 py-2 font-display text-4xl font-extrabold text-foreground outline-none placeholder:text-muted-foreground/40';
  const modes = [
    { label: 'Host a quiz', sub: 'Big screen, every phone plays', icon: Gamepad2, cls: 'bg-accent text-accent-foreground', tilt: -2, onClick: () => setShowPicker(true) },
    { label: 'Pass the Pencil', sub: 'Draw it together, guess it fast', icon: Paintbrush, cls: 'bg-secondary text-secondary-foreground', tilt: 1, onClick: handleHostCanvas },
    { label: 'Make a quiz', sub: 'Your questions, your rules', icon: PenTool, cls: 'bg-quiz-blue text-primary-foreground', tilt: -1, onClick: () => navigate('/create') },
  ];

  return (
    <main className="quiz-screen flex min-h-screen items-center px-5 py-16 md:px-10">
      <div className="stage-grid" aria-hidden="true" />
      <PartyBackdrop />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <header className="space-y-6">
          <motion.p initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -4 }} transition={{ type: 'spring', bounce: 0.7, delay: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-[hsl(var(--shadow-color))] bg-primary px-4 py-1 font-extrabold text-primary-foreground shadow-[var(--shadow-ink-sm)]">
            <Sparkles className="h-4 w-4" /> Team game night
          </motion.p>
          <h1 className="font-display text-[clamp(4.5rem,13vw,10rem)] font-extrabold leading-[0.82] tracking-tight">
            <BouncyWord text="Quiz" className="block" />
            <BouncyWord text="clash!" className="block text-primary [text-shadow:6px_6px_0_hsl(var(--shadow-color))]" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="max-w-md text-xl font-semibold text-muted-foreground">
            One screen hosts. Every phone plays. Everyone shouts.
          </motion.p>
        </header>

        <div className="space-y-5">
          <motion.div initial={{ y: 60, opacity: 0, rotate: 6 }} animate={{ y: 0, opacity: 1, rotate: 1 }} transition={{ delay: 0.25, type: 'spring', bounce: 0.5 }}
            className="sticker bg-card p-6 md:p-8">
            <AnimatePresence mode="wait">
            {!codeOk ? (
              <motion.div key="code" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0, rotate: 4 }} transition={{ type: 'spring', bounce: 0.5 }}>
                <label htmlFor="pin" className="mb-3 block font-display text-2xl font-extrabold">Got a game code?</label>
                <div className="flex items-center gap-3 rounded-xl border-[3px] border-[hsl(var(--shadow-color))] bg-background px-4 focus-within:ring-4 focus-within:ring-primary/60">
                  <input id="pin" name="pin" value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
                    placeholder="0000" inputMode="numeric" autoComplete="off" maxLength={4}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                    className={`${inputCls} tracking-[0.4em]`} />
                  <Button onClick={handleCheckCode} disabled={loading || joinCode.length !== 4} size="icon" aria-label="Find game" className="h-12 w-12 shrink-0"><ArrowRight /></Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="name" initial={{ x: -60, opacity: 0, rotate: -4 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={{ x: 60, opacity: 0 }} transition={{ type: 'spring', bounce: 0.5 }}>
                <div className="mb-3 flex items-center justify-between">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} className="rounded-full bg-secondary px-3 py-0.5 text-sm font-extrabold text-secondary-foreground">Game {joinCode} found!</motion.span>
                  <Button variant="ghost" size="sm" onClick={() => { setCodeOk(false); setError(null); }}><ArrowLeft /> Change</Button>
                </div>
                <label htmlFor="name" className="mb-3 block font-display text-2xl font-extrabold">What's your team called?</label>
                <div className="flex items-center gap-3 rounded-xl border-[3px] border-[hsl(var(--shadow-color))] bg-background px-4 focus-within:ring-4 focus-within:ring-primary/60">
                  <input id="name" name="team" value={playerName}
                    onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
                    placeholder="The Brainiacs…" autoFocus autoComplete="off" maxLength={24}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className={`${inputCls} text-3xl`} />
                  <Button onClick={handleJoin} disabled={loading || !playerName.trim()} size="icon" aria-label="Join game" className="h-12 w-12 shrink-0"><ArrowRight /></Button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            {error && <p role="alert" className="mt-4 animate-shake font-bold text-destructive">{error}</p>}
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3">
            {modes.map((m, i) => (
              <motion.button key={m.label} type="button" onClick={m.onClick} disabled={loading}
                initial={{ y: 80, opacity: 0, rotate: 12 }} animate={{ y: 0, opacity: 1 }}
                whileHover={{ y: -8, rotate: i % 2 ? 3 : -3, scale: 1.05, transition: { type: 'spring', stiffness: 700, damping: 14 } }}
                whileTap={{ scale: 0.92, rotate: 0, transition: { duration: 0.08 } }}
                transition={{ type: 'spring', bounce: 0.55, delay: 0.4 + i * 0.1 }}
                className={`sticker ${m.cls} ${m.rot} flex flex-col items-start gap-2 p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50`}>
                <m.icon className="h-7 w-7" aria-hidden />
                <span className="font-display text-lg font-extrabold leading-tight">{m.label}</span>
                <span className="text-sm font-semibold opacity-80">{m.sub}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Index;
