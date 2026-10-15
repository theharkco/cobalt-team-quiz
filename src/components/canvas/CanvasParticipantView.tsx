import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ContestantStage from '@/components/canvas/ContestantStage';
import CanvasGuessFeed from '@/components/canvas/CanvasGuessFeed';
import CanvasLeaderboard from '@/components/canvas/CanvasLeaderboard';
import CorrectBurst from '@/components/canvas/CorrectBurst';
import GuessWordStatus from '@/components/canvas/GuessWordStatus';
import NearMissFeedback from '@/components/canvas/NearMissFeedback';
import WordHintDisplay from '@/components/canvas/WordHintDisplay';
import { Check, Eye, LockKeyhole, Pencil, Send, Trophy, Users, X } from 'lucide-react';
import HowToPlay from '@/components/quiz/HowToPlay';
import { AnimatePresence, motion } from 'framer-motion';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/canvas/DrawingCanvas';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistBanner, ArtistFrame, ArtistHandoff, CanvasStats, DrawTools, NewWordBanner, PassBanner, RevealBanner, TurnPips } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame } from '@/hooks/useCanvasGame';
import type { Point } from '@/types/canvas';
import { cn } from '@/lib/utils';

import { PEN_COLORS, PEN_WIDTHS } from '@/data/canvas/canvasScoring';

interface Props {
  state: ReturnType<typeof useCanvasGame>;
  playerId: string | undefined;
  now: number;
  hostControls?: React.ReactNode;
  canvasRef?: React.Ref<DrawingCanvasHandle>;
}

export default function CanvasParticipantView({ state, playerId, now, hostControls, canvasRef }: Props) {
  const { game, players, strokes, guesses, live, loaded, sendLive, commitStroke, sendGuess, wordHint } = state;
  const [secret, setSecret] = useState<{ roundKey: string; prompt: string } | null>(null);
  const [guess, setGuess] = useState('');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[0].value);

  const me = players.find((p) => p.id === playerId);
  const isArtist = !!game && game.current_artist_id === playerId && game.phase === 'drawing';
  const knowsWord = !!game && (game.round_artist_ids ?? []).includes(playerId ?? '');
  const roundKey = game ? `${game.masterpiece_index}-${knowsWord}` : '';
  const prompt = knowsWord && secret?.roundKey === roundKey ? secret : null;

  useEffect(() => {
    setSecret(null);
    if (!knowsWord || !game || !playerId) return;
    let cancelled = false;
    canvasDb.rpc('get_canvas_prompt_for_artist', { _game_id: game.id, _player_id: playerId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row && !cancelled) setSecret({ roundKey, prompt: row.prompt });
    });
    return () => { cancelled = true; };
  }, [roundKey, game?.id, playerId]);

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
  const [wrong, setWrong] = useState<{ id: string; text: string; closeness?: 'close' | 'very-close' } | null>(null);
  const reacted = useRef(new Set<string>());
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (solved) { setWrong(null); clearTimeout(wrongTimer.current); return; }
    const rejected = myGuesses.filter((g) => g.verdict && g.verdict !== 'correct' && !reacted.current.has(g.id));
    if (!rejected.length) return;
    rejected.forEach((g) => reacted.current.add(g.id));
    const latest = rejected[rejected.length - 1];
    const closeness = latest.verdict === 'close' || latest.verdict === 'very-close' ? latest.verdict : undefined;
    setWrong({ id: latest.id, text: latest.guess, closeness });
    clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrong(null), closeness ? 3000 : 1400);
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
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="stage-kicker">You're in</p>
          <motion.p
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="break-words font-display text-5xl font-bold text-primary md:text-6xl"
          >
            {me.name}
          </motion.p>
          <motion.h1
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.35 }}
            className="font-display text-4xl font-bold leading-tight md:text-6xl"
          >
            One word.<br />Up to three artists.<br /><span className="text-primary">One pencil.</span>
          </motion.h1>
          <p className="font-display font-bold text-primary">{game.addition_seconds}s per artist · {game.duration_seconds / 60} min game</p>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="status-dot" /> {players.length} {players.length === 1 ? "player" : "players"} waiting for the host…
          </p>
        </div>
        <HowToPlay
          className="mx-auto mt-8 max-w-2xl"
          steps={[
            { icon: Eye, tone: 'primary', title: 'Get the secret word', body: 'When the pencil comes to you, a secret word appears on your screen — only you can see it.' },
            { icon: Pencil, tone: 'secondary', title: `Draw it in ${game.addition_seconds}s`, body: 'Sketch the word with any color and pen width. Run out of time? The pencil passes to the next artist, who keeps drawing the same word!' },
            { icon: Send, tone: 'accent', title: 'Everyone else guesses', body: 'Watch the drawing grow live and type guesses as fast as you can. Once you\'ve drawn a word, you sit out the guessing for that word.' },
            { icon: Trophy, tone: 'primary', title: 'Faster guesses, more points', body: 'Correct guesses earn up to 300 points — the earlier the artist and the quicker you solve, the more you get. Guess as often as you like!' },
            { icon: Users, tone: 'secondary', wide: true, title: 'Side challenge: the group score', body: 'Everyone also plays for one shared group score. A solved word adds up to 300 points — more for earlier artists and faster solves. The drawing artist earns the same as a personal bonus. Try to beat the group record!' },
          ]}
        />
        <div className="mx-auto mt-8 w-full max-w-4xl"><CanvasLeaderboard game={game} players={players} /></div>
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
    if (!text || solved || isArtist || knowsWord || game.phase !== 'drawing') return;
    setGuess('');
    await sendGuess(me.id, text);
  };

  const visibleLive = live.filter((l) => l.key !== liveKey);

  const tools = isArtist && <DrawTools color={penColor} width={penWidth} onColor={setPenColor} onWidth={setPenWidth} />;

  return (
    <QuizScreen className={cn('pencil-game-screen', isArtist && 'pencil-artist-screen')} showBack={false} showBackdrop={false} eyebrow={`Pencil · Word ${game.masterpiece_index}`} contentClassName="py-5 md:py-8" corner={<span className="text-sm font-bold tabular-nums text-primary">{me.canvas_score} pts</span>}>
      <div className="pencil-game-content mx-auto w-full max-w-[1500px] space-y-4 px-3 md:px-8">
        <div className="border-b border-border/60 pb-4">
        <CanvasStats game={game} now={now} compact />
        </div>
        {!isArtist && !knowsWord && <div className="pencil-guess-context"><GuessWordStatus game={game} now={now} />
        {!isArtist && !knowsWord && !solved && game.phase === 'drawing' && wordHint?.round === game.masterpiece_index && <WordHintDisplay hint={wordHint} />}
        </div>}
        {isArtist
          ? <ArtistBanner turn={game.addition_index} word={prompt?.prompt} />
          : <ArtistHandoff artist={artist} />}
        {!isArtist && knowsWord && (game.phase === 'drawing' || game.phase === 'grace') && (
          <motion.section key={`passed-${game.masterpiece_index}`} role="status" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="flex items-start gap-3 rounded-lg border border-primary/50 bg-primary/10 p-4">
            <LockKeyhole className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">You passed the pencil</h2>
              <p className="mt-1 text-sm text-muted-foreground">You’ve seen the word, so you can’t guess this round. You can guess again on the next word.</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary"><Eye className="h-4 w-4 shrink-0" /> Watching {artist?.name ?? 'the next artist'} draw</p>
              {prompt && <p className="mt-2 break-words text-sm text-muted-foreground">Secret word: <b className="text-foreground">{prompt.prompt}</b></p>}
            </div>
          </motion.section>
        )}
        <div className="flex items-center gap-3"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
        {!isArtist && !knowsWord && (game.phase === 'drawing' || game.phase === 'grace') ? (
          solved ? (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.6 }}
              className="flex items-center gap-2 rounded-lg border-2 border-secondary bg-secondary/15 p-4 font-display text-xl font-bold text-secondary"><Check /> You got it! +{myPoints}</motion.div>
          ) : (
            <motion.form
              animate={wrong && !wrong.closeness ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
              className={cn('pencil-guess-form relative rounded-lg border-2 bg-card p-3 transition-colors',
                wrong?.closeness ? 'pencil-guess-near' : wrong ? 'border-destructive shadow-[0_0_24px_hsl(var(--destructive)/0.45)]' : 'border-accent shadow-[0_0_24px_hsl(var(--accent)/0.3)]')}
              onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
              <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
                <p className="stage-kicker text-accent">Your guess</p>
                <AnimatePresence>
                  {wrong && !wrong.closeness && (
                    <motion.span key={wrong.id} role="status" initial={{ scale: 0, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.5, opacity: 0, y: -10 }}
                      transition={{ type: 'spring', bounce: 0.6 }}
                      className="flex items-center gap-1 min-w-0 truncate rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                      <X className="h-4 w-4 shrink-0" /> Not quite!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">{wrong?.closeness && <NearMissFeedback key={wrong.id} level={wrong.closeness} />}</AnimatePresence>
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
              ref={canvasRef}
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
          <aside className="pencil-rail">
            <CanvasGuessFeed game={game} players={players} guesses={guesses} />
            <ContestantStage game={game} players={players} guesses={guesses} now={now} meId={me.id} compact />
          </aside>
        </div>
        {hostControls}
        <CanvasLeaderboard game={game} players={players} />
        <CorrectBurst show={burst} points={myPoints} onDone={endBurst} />
      </div>
    </QuizScreen>
  );
}
