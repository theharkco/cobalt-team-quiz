import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PartyBackdrop, { BouncyWord } from '@/components/quiz/PartyBackdrop';
import { Button } from '@/components/ui/button';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';
import { canvasDb } from '@/hooks/useCanvasGame';
import TypewriterTagline from '@/components/quiz/TypewriterTagline';
import { ArrowLeft, ArrowRight, Gamepad2, Paintbrush, PenTool, Sparkles } from 'lucide-react';

// Hover/tap spring for the mode cards: no delay, so the card settles back the
// instant the pointer leaves (the entrance stagger lives on the wrapper instead).
const CARD_SPRING = { type: 'spring' as const, stiffness: 900, damping: 16, mass: 0.5 };

const Index = () => {
  const navigate = useNavigate();
  const { createSession, joinSession, findSession, error, setError } = useQuizSession();
  const [params, setParams] = useSearchParams();
  const showPicker = params.get('host') === 'quiz';
  const selectedMode = params.get('mode') === 'quiz' ? 'quiz' : params.get('mode') === 'canvas' ? 'canvas' : null;
  const setShowPicker = (v: boolean) => setParams(v ? { mode: 'quiz', host: 'quiz' } : { mode: 'quiz' });
  const reducedMotion = useReducedMotion();
  const actionTitleRef = useRef<HTMLHeadingElement>(null);
  const firstModeRef = useRef<HTMLButtonElement>(null);
  const previousModeRef = useRef(selectedMode);
  const startingRef = useRef(false);
  useEffect(() => {
    if (!showPicker) {
      if (selectedMode) actionTitleRef.current?.focus();
      else if (previousModeRef.current) firstModeRef.current?.focus();
    }
    previousModeRef.current = selectedMode;
  }, [selectedMode, showPicker]);
  const [joinCode, setJoinCode] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState('quiz');

  const handleHost = async (questions: QuizQuestion[], quizId?: string) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setLoading(true);
    try {
    const session = await createSession();
    if (session) {
      sessionStorage.setItem(`quiz-questions-${session.id}`, JSON.stringify(questions));
      if (quizId) {
        await supabase.from('quiz_sessions').update({ quiz_id: quizId }).eq('id', session.id);
      }
      navigate(`/host/${session.id}`);
    }
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  };

  const handleHostCanvas = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setLoading(true);
    try {
    const session = await createSession();
    if (session) {
      const token = crypto.randomUUID();
      sessionStorage.setItem(`canvas-host-${session.id}`, token);
      await canvasDb.from('quiz_sessions').update({ game_mode: 'canvas' }).eq('id', session.id);
      const { data: g } = await canvasDb.from('canvas_games').insert({ session_id: session.id }).select('id').single();
      if (g) await canvasDb.rpc('set_canvas_prompt', { _game_id: (g as { id: string }).id, _host_token: token, _prompt: null, _answer: null, _alternates: [] });
      navigate(`/canvas-host/${session.id}`);
    }
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
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
    { mode: 'quiz', label: 'Quiz', sub: 'Questions, music & friendly rivalry', icon: Gamepad2, cls: 'bg-accent text-accent-foreground', tilt: -2 },
    { mode: 'canvas', label: 'Pass the Pencil', sub: 'Draw it together, guess it fast', icon: Paintbrush, cls: 'bg-secondary text-secondary-foreground', tilt: 1 },
  ];

  return (
    <main className="frontpage-screen quiz-screen flex min-h-screen items-center px-5 py-16 md:px-10">
      <div className="stage-grid" aria-hidden="true" />
      <PartyBackdrop />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <header className="space-y-6">
          <motion.p initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -4 }} transition={{ type: 'spring', bounce: 0.7, delay: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-[hsl(var(--shadow-color))] bg-primary px-4 py-1 font-extrabold text-primary-foreground shadow-[var(--shadow-ink-sm)]">
            <Sparkles className="h-4 w-4" /> Thursday game day!
          </motion.p>
          <h1 className="font-display text-7xl font-extrabold leading-[0.82] sm:text-8xl lg:text-[9rem]">
            <BouncyWord text="Go," className="block" />
            <BouncyWord text="Cobalt!" className="block text-primary [text-shadow:6px_6px_0_hsl(var(--shadow-color))]" />
          </h1>
          <TypewriterTagline />
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
                <label htmlFor="name" className="mb-3 block font-display text-2xl font-extrabold">{"What's your name?"}</label>
                <div className="flex items-center gap-3 rounded-xl border-[3px] border-[hsl(var(--shadow-color))] bg-background px-4 focus-within:ring-4 focus-within:ring-primary/60">
                  <input id="name" name="name" value={playerName}
                    onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
                    placeholder="Your name…" autoFocus autoComplete="off" maxLength={24}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className={`${inputCls} text-3xl`} />
                  <Button onClick={handleJoin} disabled={loading || !playerName.trim()} size="icon" aria-label="Join game" className="h-12 w-12 shrink-0"><ArrowRight /></Button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            {error && <p role="alert" className="mt-4 animate-shake font-bold text-destructive">{error}</p>}
          </motion.div>

          <section aria-label="Start a game" className="min-h-[220px]">
          <AnimatePresence initial={false}>
          {!selectedMode ? (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="grid grid-cols-2 gap-4">
            {modes.map((m, i) => (
              <motion.div key={m.label} animate={{ rotate: reducedMotion ? 0 : m.tilt }}
                whileHover={reducedMotion ? undefined : { y: -5, rotate: i % 2 ? 3 : -3 }}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }} transition={CARD_SPRING}>
                <Button ref={i === 0 ? firstModeRef : undefined} type="button" variant="ghost" onClick={() => setParams({ mode: m.mode })} disabled={loading}
                  className={`sticker ${m.cls} h-full min-h-[200px] w-full flex-col items-start justify-between gap-4 whitespace-normal p-5 text-left hover:bg-inherit hover:text-inherit [&_svg]:size-7`}>
                  <m.icon aria-hidden="true" />
                  <span className="flex flex-col gap-2">
                    <span className="font-display text-2xl font-extrabold leading-tight">{m.label}</span>
                    <span className="text-sm font-semibold leading-snug opacity-80">{m.sub}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="self-end" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
          ) : (
            <motion.div key={selectedMode} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setParams({})} disabled={loading} className="px-0"><ArrowLeft aria-hidden="true" /> Back to games</Button>
              <h2 ref={actionTitleRef} tabIndex={-1} className="flex items-center gap-3 font-display text-3xl font-extrabold outline-none">
                {selectedMode === 'quiz' ? <Gamepad2 className="size-7 text-accent" aria-hidden="true" /> : <Paintbrush className="size-7 text-secondary" aria-hidden="true" />}
                {selectedMode === 'quiz' ? 'Quiz' : 'Pass the Pencil'}
              </h2>
              <div className="grid gap-3">
                {selectedMode === 'quiz' ? <>
                  <Button size="lg" onClick={() => setShowPicker(true)} disabled={loading} className="w-full justify-between"><span>Host a quiz</span><ArrowRight aria-hidden="true" /></Button>
                  <Button variant="outline" size="lg" onClick={() => navigate('/create')} disabled={loading} className="w-full justify-between"><span className="flex items-center gap-2"><PenTool aria-hidden="true" /> Make a quiz</span><ArrowRight aria-hidden="true" /></Button>
                </> : (
                  <Button variant="secondary" size="lg" onClick={handleHostCanvas} disabled={loading} className="w-full justify-between"><span>{loading ? 'Starting game…' : 'Host a game'}</span><ArrowRight aria-hidden="true" /></Button>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Index;
