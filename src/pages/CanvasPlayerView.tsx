import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Eraser, Pencil, Send, Trash2, Undo2, X } from 'lucide-react';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistBanner, ArtistFrame, CanvasStats, PassBanner, RevealBanner, TurnPips } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame, useNow } from '@/hooks/useCanvasGame';
import type { Point } from '@/types/canvas';
import { cn } from '@/lib/utils';

const PEN_WIDTH = 0.008;

export default function CanvasPlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const { game, players, strokes, guesses, live, loaded, sendLive, commitStroke, removeStrokes } = useCanvasGame(sessionId);
  const now = useNow();
  const [prompt, setPrompt] = useState<{ prompt: string; answer: string } | null>(null);
  const [guess, setGuess] = useState('');
  const [erasing, setErasing] = useState(false);

  const me = players.find((p) => p.id === playerId);
  const isArtist = !!game && game.current_artist_id === playerId && game.phase === 'drawing';
  const knowsWord = !!game && (game.round_artist_ids ?? []).includes(playerId ?? '');
  const roundKey = game ? `${game.masterpiece_index}-${knowsWord}` : '';

  useEffect(() => {
    setPrompt(null);
    setErasing(false);
    if (!knowsWord || !game) return;
    canvasDb.rpc('get_canvas_prompt_for_artist', { _game_id: game.id, _player_id: playerId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setPrompt(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);
  useEffect(() => { setErasing(false); }, [isArtist]);

  const myGuesses = useMemo(() => guesses.filter((g) => game && g.player_id === playerId
    && g.masterpiece_index === game.masterpiece_index), [guesses, game, playerId]);
  const solved = myGuesses.some((g) => g.is_correct);
  const myStrokes = useMemo(() => strokes.filter((s) => game && s.artist_id === playerId), [strokes, game, playerId]);

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
          <p className="font-display text-5xl font-bold" style={{ color: me.color }}>{me.name}</p>
          <p className="text-muted-foreground">When the pencil comes to you, you'll see the secret word and get 15 seconds to draw in your own color. The rest of the time, guess the word!</p>
          <p className="text-sm text-muted-foreground">{players.length} players waiting for the host…</p>
        </div>
      </QuizScreen>
    );
  }

  const artist = players.find((p) => p.id === game.current_artist_id);
  const liveKey = `cur-${playerId}`;

  const onLive = (points: Point[]) => sendLive({ key: liveKey, color: me.color, width: PEN_WIDTH, points });
  const onCommit = async (points: Point[]) => {
    sendLive({ key: liveKey, color: me.color, width: PEN_WIDTH, points: [] }, true);
    await commitStroke(me.id, me.color, PEN_WIDTH, points);
  };
  const onEraseAt = ([x, y]: Point) => {
    const hit = myStrokes.find((s) => s.points.some(([px, py]) => Math.hypot(px - x, py - y) < 0.025));
    if (hit) removeStrokes([hit.id]);
  };

  const submitGuess = async () => {
    const text = guess.trim();
    if (!text || solved) return;
    setGuess('');
    await canvasDb.from('canvas_guesses').insert({
      game_id: game.id, player_id: me.id, masterpiece_index: game.masterpiece_index, addition_index: game.addition_index, guess: text,
    });
  };

  const visibleLive = live.filter((l) => l.key !== liveKey);

  const tools = isArtist && (
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
      <Button variant={!erasing ? 'default' : 'outline'} onClick={() => setErasing(false)}><Pencil /> Pen</Button>
      <Button variant={erasing ? 'default' : 'outline'} onClick={() => setErasing(true)}><Eraser /> Erase</Button>
      <Button variant="outline" disabled={!myStrokes.length} onClick={() => removeStrokes([myStrokes[myStrokes.length - 1].id])}><Undo2 /> Undo</Button>
      <Button variant="outline" disabled={!myStrokes.length} onClick={() => removeStrokes(myStrokes.map((s) => s.id))}><Trash2 /> Clear</Button>
    </div>
  );

  return (
    <QuizScreen eyebrow={`Word ${game.masterpiece_index}`} corner={<span className="text-sm font-bold tabular-nums" style={{ color: me.color }}>{me.canvas_score} pts</span>}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <CanvasStats game={game} now={now} compact />
        <ArtistBanner artist={artist} isMe={isArtist} turn={game.addition_index} word={knowsWord ? prompt?.prompt : undefined} passed={knowsWord && !isArtist} />
        <div className="flex items-center gap-3"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
        <div className={cn('grid gap-3', isArtist && 'lg:grid-cols-[1fr_140px]')}>
          <ArtistFrame artist={artist}>
            <DrawingCanvas
              strokes={strokes}
              live={isArtist ? live : visibleLive}
              editable={isArtist}
              color={me.color}
              width={PEN_WIDTH}
              erasing={erasing}
              onLive={onLive}
              onCommit={onCommit}
              onEraseAt={onEraseAt}
              className="rounded-md border-0"
            />
            <PassBanner game={game} artist={artist} now={now} isMe={isArtist} />
            <RevealBanner game={game} />
          </ArtistFrame>
          {tools}
        </div>

        {!isArtist && !knowsWord && (game.phase === 'drawing' || game.phase === 'grace') ? (
          solved ? (
            <div className="flex items-center gap-2 rounded-lg border border-secondary p-4 font-bold text-secondary"><Check /> You got it! Nice one.</div>
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
      </div>
    </QuizScreen>
  );
}
