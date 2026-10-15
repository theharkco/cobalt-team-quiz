import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Paintbrush, Play, SkipForward, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import CanvasParticipantView from '@/components/canvas/CanvasParticipantView';
import { useQuizSession } from '@/hooks/useQuizSession';
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/canvas/DrawingCanvas';
import ContestantStage from '@/components/canvas/ContestantStage';
import CanvasGuessFeed from '@/components/canvas/CanvasGuessFeed';
import CanvasLeaderboard from '@/components/canvas/CanvasLeaderboard';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistHandoff, CanvasStats, NewWordBanner, PassBanner, RevealBanner, TurnPips } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame } from '@/hooks/useCanvasGame';
import { useCanvasHostClock } from '@/hooks/useCanvasHostClock';
import { MAX_ARTISTS, TURN_SECONDS, guesserPointsForGuess, individualAwards, isCorrectGuess, pickArtist, teamPointsForTurn } from '@/data/canvas/canvasScoring';
import { roundAction } from '@/data/canvas/canvasRound';
import { pickPrompt, type CanvasPrompt } from '@/data/canvas/promptBanks';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { cn } from '@/lib/utils';

const REVEAL_MS = 3000;
const TITLE = 'Pass the Pencil';

interface Gain { word: string; points: number; artists: number }

export default function CanvasHostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const canvasState = useCanvasGame(sessionId);
  const { game, setGame, joinCode, players, strokes, guesses, live, loaded, refreshPlayers, markCorrect, markIncorrect } = canvasState;
  const { joinSession, error: joinError, setError: setJoinError } = useQuizSession();
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(() => sessionId ? sessionStorage.getItem(`canvas-host-player-${sessionId}`) : null);
  const [hostName, setHostName] = useState('');
  const [joining, setJoining] = useState(false);
  const now = useCanvasHostClock();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [duration, setDuration] = useState(12);
  const [artistSeconds, setArtistSeconds] = useState(TURN_SECONDS);
  const settingsGameId = useRef<string | null>(null);
  const [record, setRecord] = useState<number | null>(null);
  const [gains, setGains] = useState<Gain[]>([]);

  const token = sessionId ? sessionStorage.getItem(`canvas-host-${sessionId}`) : null;
  const gameRef = useRef<CanvasGame | null>(game);
  gameRef.current = game;
  const promptRef = useRef<CanvasPrompt | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const correctRef = useRef<{ playerId: string; at: number; points: number }[]>([]);
  const busyRef = useRef(false);
  const waitingRef = useRef(false);
  const revealEndsAtRef = useRef<number | null>(null);
  const guessesRef = useRef(guesses);
  guessesRef.current = guesses;

  useEffect(() => {
    if (!game || settingsGameId.current === game.id) return;
    settingsGameId.current = game.id;
    setDuration(game.duration_seconds / 60);
    setArtistSeconds(game.addition_seconds);
  }, [game]);

  useEffect(() => {
    canvasDb.from('canvas_games').select('team_score').eq('status', 'finished').order('team_score', { ascending: false }).limit(1)
      .then(({ data }) => setRecord(data && data.length ? (data[0] as { team_score: number }).team_score : 0));
  }, []);

  // Recover the secret word after a host refresh
  useEffect(() => {
    if (!game || !token || promptRef.current || game.status !== 'playing') return;
    canvasDb.rpc('get_canvas_prompt_for_host', { _game_id: game.id, _host_token: token }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.answer) promptRef.current = { text: row.prompt, answer: row.answer, alternates: row.alternates ?? [] };
    });
  }, [game, token]);

  const patch = useCallback(async (fields: Partial<CanvasGame>) => {
    const g = gameRef.current;
    if (!g) return;
    const next = { ...g, ...fields } as CanvasGame;
    gameRef.current = next;
    await canvasDb.from('canvas_games').update(fields).eq('id', g.id);
    // Artist prompt access depends on the saved round_artist_ids. Do not mount
    // the host's drawing screen before that change has reached the database.
    setGame(next);
  }, [setGame]);

  const timeIsUp = () => {
    const g = gameRef.current;
    return !!g?.game_ends_at && Date.now() >= new Date(g.game_ends_at).getTime();
  };

  const fetchRoster = async (g: CanvasGame) => {
    const { data } = await canvasDb.from('players').select('*').eq('session_id', g.session_id);
    return (data ?? []) as CanvasPlayer[];
  };

  const assignArtist = async (roster: CanvasPlayer[], exclude: string[]) => {
    const id = pickArtist(roster, exclude);
    if (!id) return null;
    const p = roster.find((r) => r.id === id);
    if (!p) return null;
    await canvasDb.from('players').update({ draw_count: p.draw_count + 1 }).eq('id', id);
    return id;
  };

  const startRound = useCallback(async (first = false) => {
    const g = gameRef.current;
    if (!g || !token) return;
    const roster = await fetchRoster(g);
    const artistId = await assignArtist(roster, []);
    if (!artistId) { waitingRef.current = true; await patch({ phase: 'idle', current_artist_id: null }); busyRef.current = false; return; }
    waitingRef.current = false;
    const prompt = pickPrompt(g.used_answers ?? []);
    promptRef.current = prompt;
    processedRef.current = new Set(guessesRef.current.map((x) => x.id));
    correctRef.current = [];
    await canvasDb.rpc('set_canvas_prompt', { _game_id: g.id, _host_token: token, _prompt: prompt.text, _answer: prompt.answer, _alternates: prompt.alternates ?? [] });
    await patch({
      masterpiece_index: first ? g.masterpiece_index : g.masterpiece_index + 1,
      addition_index: 1, round_artist_ids: [artistId], current_artist_id: artistId,
      phase: 'drawing', addition_started_at: new Date().toISOString(), revealed_answer: null, last_result: null, last_points: 0,
      words_attempted: g.words_attempted + 1, used_answers: [...(g.used_answers ?? []), prompt.answer], scene: [prompt.text],
    });
    busyRef.current = false;
  }, [token, patch]);

  const saveDrawing = async (points: number) => {
    const g = gameRef.current;
    if (!g) return;
    await canvasDb.from('canvas_masterpieces').insert({
      game_id: g.id, masterpiece_index: g.masterpiece_index, scene: [promptRef.current?.text ?? g.revealed_answer ?? ''],
      additions: g.round_artist_ids.length, points, image_data: canvasRef.current?.toDataURL() ?? null,
    });
  };

  const finishGame = useCallback(async () => {
    await patch({ status: 'finished', phase: 'idle', current_artist_id: null });
  }, [patch]);

  const afterReveal = useCallback(() => {
    revealEndsAtRef.current = Date.now() + REVEAL_MS;
    busyRef.current = false;
  }, []);

  const resolveSuccess = useCallback(async () => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || (g.phase !== 'drawing' && g.phase !== 'grace') || busyRef.current) return;
    busyRef.current = true;
    const ordered = [...correctRef.current].sort((a, b) => a.at - b.at);
    const firstSolveAt = ordered[0] ? new Date(ordered[0].at).toISOString() : null;
    const teamPts = teamPointsForTurn(g.addition_index, g.addition_seconds, g.addition_started_at, firstSolveAt);
    const awards = individualAwards(g.round_artist_ids, ordered.map((c) => c.playerId), Object.fromEntries(ordered.map((c) => [c.playerId, c.points])), teamPts);
    const { data } = await canvasDb.from('players').select('id, canvas_score').in('id', awards.map((a) => a.playerId));
    await Promise.all(awards.map((a) => {
      const cur = (data as { id: string; canvas_score: number }[] | null)?.find((d) => d.id === a.playerId)?.canvas_score ?? 0;
      return canvasDb.from('players').update({ canvas_score: cur + a.points }).eq('id', a.playerId);
    }));
    await saveDrawing(teamPts);
    setGains((prev) => [{ word: prompt.text, points: teamPts, artists: g.round_artist_ids.length }, ...prev].slice(0, 6));
    await patch({
      phase: 'reveal', last_result: 'success', revealed_answer: prompt.answer, last_points: teamPts, team_score: g.team_score + teamPts,
      total_additions: g.total_additions + 1, rescue_count: g.rescue_count + (g.addition_index >= MAX_ARTISTS ? 1 : 0),
    });
    refreshPlayers();
    afterReveal();
  }, [patch, refreshPlayers, afterReveal]);

  const resolveFail = useCallback(async (result: 'fail' | 'skipped') => {
    const g = gameRef.current;
    if (!g || g.phase !== 'drawing' || busyRef.current) return;
    if (correctRef.current.length) { await resolveSuccess(); return; }
    busyRef.current = true;
    await saveDrawing(0);
    setGains((prev) => [{ word: promptRef.current?.text ?? '', points: 0, artists: g.round_artist_ids.length }, ...prev].slice(0, 6));
    await patch({ phase: 'reveal', last_result: result, revealed_answer: promptRef.current?.answer ?? '', last_points: 0 });
    afterReveal();
  }, [patch, afterReveal, resolveSuccess]);

  const passPencil = useCallback(async () => {
    const g = gameRef.current;
    if (!g || g.phase !== 'drawing' || busyRef.current) return;
    if (correctRef.current.length) { await resolveSuccess(); return; }
    if (g.addition_index >= MAX_ARTISTS || timeIsUp()) { await resolveFail('fail'); return; }
    busyRef.current = true;
    const roster = await fetchRoster(g);
    const next = await assignArtist(roster, g.round_artist_ids);
    if (!next) { busyRef.current = false; await resolveFail('fail'); return; }
    await patch({
      addition_index: g.addition_index + 1, current_artist_id: next, round_artist_ids: [...g.round_artist_ids, next],
      addition_started_at: new Date().toISOString(),
    });
    busyRef.current = false;
  }, [patch, resolveFail, resolveSuccess]);

  // Check incoming guesses
  useEffect(() => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || (g.phase !== 'drawing' && g.phase !== 'grace')) return;
    // Persisted correct guesses survive a host refresh; never award the word twice.
    for (const guess of guesses) {
      if (guess.masterpiece_index === g.masterpiece_index && guess.is_correct && !correctRef.current.some((c) => c.playerId === guess.player_id)) {
        correctRef.current.push({ playerId: guess.player_id, at: Date.parse(guess.created_at), points: guess.points_earned });
      }
    }
    for (const guess of guesses) {
      if (processedRef.current.has(guess.id)) continue;
      processedRef.current.add(guess.id);
      if (guess.masterpiece_index !== g.masterpiece_index) continue;
      if (guess.addition_index !== g.addition_index) continue;
      if (g.round_artist_ids.includes(guess.player_id) || g.current_artist_id === guess.player_id) continue;
      if (correctRef.current.some((c) => c.playerId === guess.player_id)) continue;
      if (!isCorrectGuess(guess.guess, prompt.answer, prompt.alternates)) {
        markIncorrect(guess.id);
        continue;
      }
      const points = guesserPointsForGuess(g.addition_index, g.addition_seconds, g.addition_started_at, guess.created_at);
      correctRef.current.push({ playerId: guess.player_id, at: new Date(guess.created_at).getTime(), points });
      markCorrect(guess.id, points);
    }
    const eligible = players.filter((p) => !g.round_artist_ids.includes(p.id)).map((p) => p.id);
    if (roundAction(eligible, correctRef.current.map((c) => c.playerId), false) === 'success') resolveSuccess();
  }, [guesses, players, now, resolveSuccess, markCorrect, markIncorrect]);

  // Turn timeout + idle restart when players arrive
  useEffect(() => {
    if (!game || game.status !== 'playing' || busyRef.current) return;
    // Reveal transitions use the same background-capable wall clock as turns,
    // rather than a window timeout which can stall for a minute in hidden tabs.
    if (game.phase === 'reveal') {
      // Also recover a reveal after refreshing the host screen.
      revealEndsAtRef.current ??= now + REVEAL_MS;
      if (now >= revealEndsAtRef.current) {
        revealEndsAtRef.current = null;
        busyRef.current = true;
        if (timeIsUp()) finishGame();
        else startRound();
      }
      return;
    }
    revealEndsAtRef.current = null;
    if ((game.phase === 'drawing' || game.phase === 'grace') && game.addition_started_at) {
      const end = new Date(game.addition_started_at).getTime() + game.addition_seconds * 1000;
      if (now >= end || timeIsUp()) {
        if (correctRef.current.length) resolveSuccess();
        else passPencil();
      }
    }
    if (game.phase === 'idle' && waitingRef.current && players.length > 1) { busyRef.current = true; startRound(); }
  }, [now, game, players.length, passPencil, startRound, resolveSuccess, finishGame]);

  const startGame = async () => {
    if (!game) return;
    busyRef.current = true;
    await patch({
      status: 'playing', duration_seconds: duration * 60, addition_seconds: artistSeconds, team_score: 0, used_answers: [], words_attempted: 0, rescue_count: 0, total_additions: 0,
      game_ends_at: new Date(Date.now() + duration * 60_000).toISOString(),
    });
    await startRound(true);
  };

  const joinAsHost = async () => {
    if (!sessionId || !token || joining || game?.status !== 'lobby') return;
    setJoining(true);
    setJoinError(null);
    try {
      const player = await joinSession(joinCode, hostName);
      if (!player) return;
      sessionStorage.setItem(`canvas-host-player-${sessionId}`, player.id);
      setHostPlayerId(player.id);
      await refreshPlayers();
    } finally {
      setJoining(false);
    }
  };

  if (!loaded) return <QuizScreen eyebrow={TITLE}><p className="text-muted-foreground">Loading…</p></QuizScreen>;
  if (!game) return <QuizScreen eyebrow={TITLE}><p>Game not found.</p></QuizScreen>;
  if (!token) return <QuizScreen eyebrow={TITLE}><p>This screen isn't the host for this game.</p></QuizScreen>;

  if (game.status === 'finished') {
    return <QuizScreen eyebrow={`${TITLE} · Final`}><CanvasResults game={game} players={players} /></QuizScreen>;
  }

  if (game.status === 'lobby') {
    const url = `${window.location.origin}`;
    return (
      <QuizScreen eyebrow={`${TITLE} · Lobby`} contentClassName="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <section className="space-y-6">
            <p className="stage-kicker flex items-center gap-2"><Paintbrush className="h-4 w-4 text-primary" /> Co-op Pictionary relay</p>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">One word.<br />Three artists.<br /><span className="text-primary">One pencil.</span></h1>
            <p className="max-w-lg text-lg text-muted-foreground">Each artist gets {artistSeconds} seconds to draw a secret word. If nobody guesses it, the pencil passes to the next artist, who keeps drawing on the same picture.</p>
            <div className="space-y-2">
              <p className="stage-kicker">Points per word</p>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((turn) => <div key={turn}><p className="text-sm text-muted-foreground">Artist {turn}</p><motion.p key={artistSeconds} initial={{ y: 5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl font-bold tabular-nums text-secondary">+{teamPointsForTurn(turn, artistSeconds)}</motion.p></div>)}
              </div>
            </div>
            <div className="stage-panel rounded-lg p-6">
              <p className="stage-kicker">Join at {url.replace(/^https?:\/\//, '')}</p>
              <p className="font-display text-8xl font-bold tracking-[0.15em] text-primary tabular-nums">{joinCode}</p>
            </div>
          </section>
          <section className="stage-panel flex flex-col rounded-lg p-6">
            <div className="mb-5 border-b border-border pb-5">
              {hostPlayerId && players.some((p) => p.id === hostPlayerId) ? (
                <p className="font-display text-lg font-bold text-secondary">Playing as {players.find((p) => p.id === hostPlayerId)?.name} · Host</p>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); joinAsHost(); }} className="space-y-3">
                  <label htmlFor="host-player-name" className="stage-kicker">Host and play</label>
                  <div className="flex flex-wrap gap-2">
                    <Input id="host-player-name" aria-label="Your player name" placeholder="Your name" autoComplete="off" maxLength={24} value={hostName} onChange={(e) => setHostName(e.target.value)} className="min-w-0 flex-1" disabled={joining} />
                    <Button type="submit" disabled={joining || !hostName.trim()}><Users /> {joining ? 'Joining…' : 'Host and play'}</Button>
                  </div>
                  {joinError && <p role="alert" className="text-sm text-destructive">{joinError}</p>}
                </form>
              )}
            </div>
            <p className="stage-kicker flex items-center gap-2"><Users className="h-4 w-4" /> {players.length} players</p>
            <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">
              {players.map((p) => (
                <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="rounded-md border border-border px-3 py-1.5 font-semibold">{p.name}</motion.li>
              ))}
              {players.length === 0 && <li className="text-muted-foreground">Waiting for players…</li>}
            </ul>
            <div className="mt-6 border-t border-border pt-5">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3"><label id="artist-time-label" className="stage-kicker">Time per artist</label><output className="font-display text-2xl font-bold tabular-nums text-primary">{artistSeconds} sec</output></div>
                  <Slider aria-labelledby="artist-time-label" min={10} max={90} step={5} value={[artistSeconds]} onValueChange={([value]) => setArtistSeconds(value)} onValueCommit={([value]) => patch({ addition_seconds: value })} />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>10 sec</span><span>90 sec</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3"><label id="game-time-label" className="stage-kicker">Total game length</label><output className="font-display text-2xl font-bold tabular-nums text-primary">{duration} min</output></div>
                  <Slider aria-labelledby="game-time-label" min={3} max={30} step={1} value={[duration]} onValueChange={([value]) => setDuration(value)} onValueCommit={([value]) => patch({ duration_seconds: value * 60 })} />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>3 min</span><span>30 min</span></div>
                </div>
              </div>
              <Button className="mt-5 w-full" size="lg" disabled={players.length < 2 || joining} onClick={startGame}>
                <Play /> {players.length < 2 ? 'Need at least 2 players' : 'Start drawing'}
              </Button>
            </div>
          </section>
        </div>
        <div className="mx-auto mt-8 w-full max-w-6xl"><CanvasLeaderboard game={game} players={players} /></div>
      </QuizScreen>
    );
  }

  const artist = players.find((p) => p.id === game.current_artist_id);
  const correctNow = guesses.filter((g) => g.is_correct && g.masterpiece_index === game.masterpiece_index);
  const timeUp = secondsLeftOf(game, now) === 0;

  if (hostPlayerId) {
    return <CanvasParticipantView state={canvasState} playerId={hostPlayerId} now={now} canvasRef={canvasRef}
      hostControls={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="stage-kicker">Host · Join code <span className="text-primary">{joinCode}</span></p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={game.phase !== 'drawing'} onClick={() => resolveFail('skipped')}><SkipForward /> Skip word</Button>
            <Button variant="ghost" onClick={finishGame}>End game now</Button>
          </div>
        </div>
      } />;
  }

  return (
    <QuizScreen showBackdrop={false} eyebrow={`Pencil · Word ${game.masterpiece_index}`} contentClassName="py-5 md:py-8" corner={<span className="font-display text-xl font-bold tabular-nums text-primary">{joinCode}</span>}>
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 md:px-8">
        <div className="border-b border-border/60 pb-5">
        <CanvasStats game={game} now={now} record={record} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <ArtistHandoff artist={artist} />
            <div className="flex w-full items-center gap-4 sm:w-96"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
        </div>
            {correctNow.length > 0 && (game.phase === 'drawing' || game.phase === 'grace') && <p className="text-sm font-bold text-secondary">{correctNow.length} got it! Everyone else — keep guessing.</p>}
            {timeUp && game.phase === 'drawing' && <p className="text-sm font-bold text-accent">Time's up — last turn!</p>}
        <div className="pencil-workspace">
          <div className="pencil-main">
            <div className="relative overflow-hidden rounded-lg border border-border">
              <DrawingCanvas ref={canvasRef} strokes={strokes} live={live} className="rounded-md border-0" />
              <PassBanner game={game} artist={artist} now={now} />
              <NewWordBanner game={game} now={now} />
              <RevealBanner game={game} />
              {game.phase === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70"><p className="font-semibold">Waiting for at least 2 players…</p></div>
              )}
            </div>
          </div>
          <aside className="pencil-rail">
            <CanvasGuessFeed game={game} players={players} guesses={guesses} />
            <ContestantStage game={game} players={players} guesses={guesses} now={now} />
          </aside>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-5 border-t border-border/60 pt-4">
            <div className="min-w-0 flex-1">
              <p className="stage-kicker mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-secondary" /> Recent score gains</p>
              {gains.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              <ul className="space-y-1.5">
                {gains.map((g, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={cn('w-12 font-display font-bold tabular-nums', g.points ? 'text-secondary' : 'text-muted-foreground')}>+{g.points}</span>
                    <span className="flex-1 truncate font-semibold">{g.word}</span>
                    {g.points > 0 && g.artists >= MAX_ARTISTS && <span className="text-xs text-primary">rescue</span>}
                  </li>
                ))}
              </ul>
            </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={game.phase !== 'drawing'} onClick={() => resolveFail('skipped')}>
              <SkipForward /> Skip word
            </Button>
            <Button variant="ghost" onClick={finishGame}>End game now</Button>
          </div>
        </div>
        <CanvasLeaderboard game={game} players={players} />
      </div>
    </QuizScreen>
  );
}

function secondsLeftOf(game: CanvasGame, now: number) {
  return game.game_ends_at ? Math.max(0, new Date(game.game_ends_at).getTime() - now) : 1;
}
