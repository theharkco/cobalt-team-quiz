import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ContestantStage from '@/components/canvas/ContestantStage';
import CorrectBurst from '@/components/canvas/CorrectBurst';
import { useParams } from 'react-router-dom';
import { Check, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
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

  if (!loaded) return <QuizScreen eyebrow="Pass the Pencil"><p className="text-muted-foreground">Loading…</p></QuizScreen>;
  if (!game || !me) return <QuizScreen eyebrow="Pass the Pencil"><p>We couldn't find you in this game.</p></QuizScreen>;

  if (game.status === 'finished') {
    return <QuizScreen eyebrow="Pass the Pencil · Final"><CanvasResults game={game} players={players} compact /></QuizScreen>;
  }

  if (game.status === 'lobby') {
    return (
      <QuizScreen eyebrow="Pass the Pencil">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="stage-kicker">You're in</p>
          <p className="font-display text-5xl font-bold text-primary">{me.name}</p>
          <p className="text-muted-foreground">When the pencil comes to you, you'll see the secret word and get 30 seconds to draw. Pick any color you like. The rest of the time, guess the word!</p>
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
    <QuizScreen eyebrow={`Word ${game.masterpiece_index}`} corner={<span className="text-sm font-bold tabular-nums text-primary">{me.canvas_score} pts</span>}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-3">
        <CanvasStats game={game} now={now} compact />
        {isArtist
          ? <ArtistBanner turn={game.addition_index} word={prompt?.prompt} />
          : <div className="flex flex-wrap items-center justify-between gap-2"><ArtistHandoff artist={artist} />{knowsWord && prompt && <span className="text-sm text-muted-foreground">You passed the pencil · <b className="text-foreground">{prompt.prompt}</b></span>}</div>}
        <div className="flex items-center gap-3"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
        <div className={cn('grid gap-3', isArtist && 'lg:grid-cols-[1fr_180px]')}>
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
          {tools}
        </div>

        {!isArtist && !knowsWord && (game.phase === 'drawing' || game.phase === 'grace') ? (
          solved ? (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.6 }}
              className="flex items-center gap-2 rounded-lg border-2 border-secondary bg-secondary/15 p-4 font-display text-xl font-bold text-secondary"><Check /> You got it! +{myPoints}</motion.div>
          ) : (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="What are they drawing?" maxLength={40} autoComplete="off" className="h-12 text-lg" />
              <Button type="submit" size="lg" disabled={!guess.trim()}><Send /> Guess</Button>
            </form>
          )
        ) : null}

        {!knowsWord && myGuesses.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {myGuesses.map((g) => (
              <li key={g.id} className={cn('flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm', g.is_correct ? 'border-secondary text-secondary' : 'border-border text-muted-foreground')}>
                {g.is_correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{g.guess}
              </li>
            ))}
          </ul>
        )}
        <ContestantStage game={game} players={players} guesses={guesses} now={now} meId={me.id} compact />
        <CorrectBurst show={burst} points={myPoints} onDone={endBurst} />
      </div>
    </QuizScreen>
  );
}
