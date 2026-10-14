import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Eraser, Pencil, Send, Trash2, Undo2, X } from 'lucide-react';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistHandoff, CanvasStats, RevealBanner, SceneTrail } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame, useNow } from '@/hooks/useCanvasGame';
import type { Point } from '@/types/canvas';
import { cn } from '@/lib/utils';

const PEN_WIDTH = 0.008;

export default function CanvasPlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const { game, players, strokes, guesses, live, loaded, sendLive, commitStroke } = useCanvasGame(sessionId);
  const now = useNow();
  const [prompt, setPrompt] = useState<{ prompt: string; answer: string } | null>(null);
  const [guess, setGuess] = useState('');
  const [erasing, setErasing] = useState(false);

  const me = players.find((p) => p.id === playerId);
  const isArtist = !!game && game.current_artist_id === playerId && game.phase === 'drawing';
  const additionKey = game ? `${game.masterpiece_index}-${game.addition_index}-${game.current_artist_id}` : '';

  useEffect(() => {
    setPrompt(null);
    setErasing(false);
    if (!isArtist || !game) return;
    canvasDb.rpc('get_canvas_prompt_for_artist', { _game_id: game.id, _player_id: playerId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setPrompt(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionKey, isArtist]);

  const myGuesses = useMemo(() => guesses.filter((g) => game && g.player_id === playerId
    && g.masterpiece_index === game.masterpiece_index && g.addition_index === game.addition_index), [guesses, game, playerId]);
  const solved = myGuesses.some((g) => g.is_correct);
  const myStrokes = useMemo(() => strokes.filter((s) => game && s.artist_id === playerId && s.addition_index === game.addition_index), [strokes, game, playerId]);

  if (!loaded) return <QuizScreen eyebrow="Infinite Canvas"><p className="text-muted-foreground">Loading…</p></QuizScreen>;
  if (!game || !me) return <QuizScreen eyebrow="Infinite Canvas"><p>We couldn't find you in this game.</p></QuizScreen>;

  if (game.status === 'finished') {
    return <QuizScreen eyebrow="Infinite Canvas · Final"><CanvasResults game={game} players={players} compact /></QuizScreen>;
  }

  if (game.status === 'lobby') {
    return (
      <QuizScreen eyebrow="Infinite Canvas">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="stage-kicker">You're in</p>
          <p className="font-display text-5xl font-bold" style={{ color: me.color }}>{me.name}</p>
          <p className="text-muted-foreground">When it's your turn, you'll get a secret word to draw in your own color. The rest of the time, guess what the artist is adding.</p>
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
  const removeStrokes = (ids: string[]) => ids.length && canvasDb.from('canvas_strokes').delete().in('id', ids);
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

  return (
    <QuizScreen eyebrow={`Masterpiece ${game.masterpiece_index}`} corner={<span className="text-sm font-bold tabular-nums" style={{ color: me.color }}>{me.canvas_score} pts</span>}>
      <div className="mx-auto w-full max-w-xl space-y-3">
        <CanvasStats game={game} now={now} compact />
        <SceneTrail scene={game.scene} />
        {isArtist ? (
          <div className="stage-panel rounded-lg border-primary p-3">
            <p className="stage-kicker">Your secret prompt — draw only the new part</p>
            <p className="font-display text-2xl font-bold">
              {prompt ? <>{prompt.prompt} <span className="text-sm font-semibold text-muted-foreground">(they must guess “{prompt.answer}”)</span></> : '…'}
            </p>
          </div>
        ) : <ArtistHandoff artist={artist} />}
        <AdditionTimer game={game} now={now} />
        <div className="relative">
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
          />
          <RevealBanner game={game} />
        </div>

        {isArtist ? (
          <div className="grid grid-cols-4 gap-2">
            <Button variant={!erasing ? 'default' : 'outline'} onClick={() => setErasing(false)}><Pencil /> Pen</Button>
            <Button variant={erasing ? 'default' : 'outline'} onClick={() => setErasing(true)}><Eraser /> Erase</Button>
            <Button variant="outline" disabled={!myStrokes.length} onClick={() => removeStrokes([myStrokes[myStrokes.length - 1].id])}><Undo2 /> Undo</Button>
            <Button variant="outline" disabled={!myStrokes.length} onClick={() => removeStrokes(myStrokes.map((s) => s.id))}><Trash2 /> Clear</Button>
          </div>
        ) : game.phase === 'drawing' ? (
          solved ? (
            <div className="flex items-center gap-2 rounded-lg border border-secondary p-4 font-bold text-secondary"><Check /> You got it! Waiting for the others…</div>
          ) : (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="What's the new addition?" maxLength={40} autoComplete="off" className="h-12 text-lg" />
              <Button type="submit" size="lg" disabled={!guess.trim()}><Send /> Guess</Button>
            </form>
          )
        ) : null}

        {!isArtist && myGuesses.length > 0 && (
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
