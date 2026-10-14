import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ContestantStage from '@/components/canvas/ContestantStage';
import CorrectBurst from '@/components/canvas/CorrectBurst';
import { useParams } from 'react-router-dom';
import { Check, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistBanner, ArtistFrame, ArtistHandoff, CanvasStats, DrawTools, NewWordBanner, PassBanner, RevealBanner, TurnPips } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame, useNow } from '@/hooks/useCanvasGame';
import type { Point } from '@/types/canvas';
import { cn } from '@/lib/utils';

import { PEN_COLORS, PEN_WIDTHS } from '@/data/canvas/canvasScoring';

export default function CanvasPlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const { game, players, strokes, guesses, live, loaded, sendLive, commitStroke, sendGuess } = useCanvasGame(sessionId);
  const now = useNow();
  const [prompt, setPrompt] = useState<{ prompt: string; answer: string } | null>(null);
  const [guess, setGuess] = useState('');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[0].value);

  const me = players.find((p) => p.id === playerId);
  const isArtist = !!game && game.current_artist_id === playerId && game.phase === 'drawing';
  const knowsWord = !!game && (game.round_artist_ids ?? []).includes(playerId ?? '');
  const roundKey = game ? `${game.masterpiece_index}-${knowsWord}` : '';

  useEffect(() => {
    setPrompt(null);
    if (!knowsWord || !game) return;
    canvasDb.rpc('get_canvas_prompt_for_artist', { _game_id: game.id, _player_id: playerId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setPrompt(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  const myGuesses = useMemo(() => guesses.filter((g) => game && g.player_id === playerId
    && g.masterpiece_index === game.masterpiece_index), [guesses, game, playerId]);
  const solved = myGuesses.some((g) => g.is_correct);
  const myPoints = myGuesses.find((g) => g.is_correct)?.points_earned ?? 0;
  const [burst, setBurst] = useState(false);
  const wasSolved = useRef(false);
  useEffect(() => {
    if (solved && !wasSolved.current) setBurst(true);
    wasSolved.current = solved;
  }, [solved]);
  const endBurst = useCallback(() => setBurst(false), []);
  const [wrong, setWrong] = useState<{ id: string; text: string } | null>(null);
  const reacted = useRef(new Set<string>());
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (solved) { setWrong(null); clearTimeout(wrongTimer.current); return; }
    const rejected = myGuesses.filter((g) => g.verdict === 'incorrect' && !reacted.current.has(g.id));
    if (!rejected.length) return;
    rejected.forEach((g) => reacted.current.add(g.id));
    const latest = rejected[rejected.length - 1];
    setWrong({ id: latest.id, text: latest.guess });
    clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrong(null), 1400);
  }, [myGuesses, solved]);
  useEffect(() => {
    setWrong(null);
    clearTimeout(wrongTimer.current);
    return () => clearTimeout(wrongTimer.current);
  }, [game?.masterpiece_index]);

  if (!loaded) return <QuizScreen showBack={false} eyebrow="Pass the Pencil"><p className="text-muted-foreground">Loading…</p></QuizScreen>;
  if (!game || !me) return <QuizScreen showBack={false} eyebrow="Pass the Pencil"><p>We couldn't find you in this game.</p></QuizScreen>;

  if (game.status === 'finished') {
    return <QuizScreen showBack={false} eyebrow="Pass the Pencil · Final"><CanvasResults game={game} players={players} compact /></QuizScreen>;
  }

  if (game.status === 'lobby') {
    return (
      <QuizScreen showBack={false} eyebrow="Pass the Pencil" contentClassName="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="stage-kicker">You're in</p>
          <p className="font-display text-5xl font-bold text-primary">{me.name}</p>
          <p className="text-muted-foreground">When the pencil comes to you, you'll see the secret word and get {game.addition_seconds} seconds to draw. Pick any color you like. The rest of the time, guess the word!</p>
          <p className="font-display font-bold text-primary">{game.addition_seconds}s per artist · {game.duration_seconds / 60} min game</p>
          <p className="text-sm text-muted-foreground">Correct guesses earn 100–20 points: faster earns more. Guess as often as you like.</p>
          <p className="text-sm text-muted-foreground">{players.length} players waiting for the host…</p>
        </div>
      </QuizScreen>
    );
  }

  const artist = players.find((p) => p.id === game.current_artist_id);
  const liveKey = `cur-${playerId}`;

  const onLive = (points: Point[]) => sendLive({ key: liveKey, color: penColor, width: penWidth, points });
  const onCommit = async (points: Point[]) => {
    sendLive({ key: liveKey, color: penColor, width: penWidth, points: [] }, true);
    await commitStroke(me.id, penColor, penWidth, points);
  };

  const submitGuess = async () => {
    const text = guess.trim();
    if (!text || solved) return;
    setGuess('');
    await sendGuess(me.id, text);
  };

  const visibleLive = live.filter((l) => l.key !== liveKey);

  const tools = isArtist && <DrawTools color={penColor} width={penWidth} onColor={setPenColor} onWidth={setPenWidth} />;

  return (
    <QuizScreen showBack={false} showBackdrop={false} eyebrow={`Pencil · Word ${game.masterpiece_index}`} contentClassName="py-5 md:py-8" corner={<span className="text-sm font-bold tabular-nums text-primary">{me.canvas_score} pts</span>}>
      <div className="mx-auto w-full max-w-[1500px] space-y-4 px-3 md:px-8">
        <div className="border-b border-border/60 pb-4">
        <CanvasStats game={game} now={now} compact />
        </div>
        {isArtist
          ? <ArtistBanner turn={game.addition_index} word={prompt?.prompt} />
          : <div className="flex flex-wrap items-center justify-between gap-2"><ArtistHandoff artist={artist} />{knowsWord && prompt && <span className="text-sm text-muted-foreground">You passed the pencil · <b className="text-foreground">{prompt.prompt}</b></span>}</div>}
        <div className="flex items-center gap-3"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
        {!isArtist && !knowsWord && (game.phase === 'drawing' || game.phase === 'grace') ? (
          solved ? (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.6 }}
              className="flex items-center gap-2 rounded-lg border-2 border-secondary bg-secondary/15 p-4 font-display text-xl font-bold text-secondary"><Check /> You got it! +{myPoints}</motion.div>
          ) : (
            <motion.form
              animate={wrong ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
              className={cn('relative rounded-lg border-2 bg-card p-3 transition-colors',
                wrong ? 'border-destructive shadow-[0_0_24px_hsl(var(--destructive)/0.45)]' : 'border-accent shadow-[0_0_24px_hsl(var(--accent)/0.3)]')}
              onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
              <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
                <p className="stage-kicker text-accent">Your guess</p>
                <AnimatePresence>
                  {wrong && (
                    <motion.span key={wrong.id} role="status" initial={{ scale: 0, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.5, opacity: 0, y: -10 }}
                      transition={{ type: 'spring', bounce: 0.6 }}
                      className="flex items-center gap-1 min-w-0 truncate rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                      <X className="h-4 w-4 shrink-0" /> Not quite!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <Input value={guess} onChange={(e) => setGuess(e.target.value)} aria-label="Your guess" placeholder="What is it?" maxLength={40} autoComplete="off" autoFocus
                  className="h-14 min-w-0 flex-1 border-0 bg-background/60 font-display text-xl font-bold focus-visible:ring-2 focus-visible:ring-accent sm:text-2xl" />
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button type="submit" size="lg" className="h-14 shrink-0 bg-accent px-4 text-lg text-accent-foreground hover:bg-accent/90" disabled={!guess.trim()}><Send /> Guess</Button>
                </motion.div>
              </div>
            </motion.form>
          )
        ) : null}

        {tools}
        <div className="pencil-workspace">
          <div className="pencil-main">
          <ArtistFrame active={isArtist}>
            <DrawingCanvas
              strokes={strokes}
              live={isArtist ? live : visibleLive}
              editable={isArtist}
              color={penColor}
              width={penWidth}
              onLive={onLive}
              onCommit={onCommit}
              className="rounded-md border-0"
            />
            <PassBanner game={game} artist={artist} now={now} isMe={isArtist} />
            <NewWordBanner game={game} now={now} isMe={isArtist} />
            <RevealBanner game={game} />
          </ArtistFrame>
          </div>
          <ContestantStage game={game} players={players} guesses={guesses} now={now} meId={me.id} compact />
        </div>
        <CorrectBurst show={burst} points={myPoints} onDone={endBurst} />
      </div>
    </QuizScreen>
  );
}
