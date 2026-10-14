import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Paintbrush, Play, SkipForward, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/canvas/DrawingCanvas';
import ContestantStage from '@/components/canvas/ContestantStage';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistHandoff, CanvasStats, NewWordBanner, PassBanner, RevealBanner, TurnPips } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame, useNow } from '@/hooks/useCanvasGame';
import { EXTRA_GUESS_WINDOW_MS, MAX_ARTISTS, TURN_SECONDS, individualAwards, isCorrectGuess, pickArtist, teamPointsForTurn } from '@/data/canvas/canvasScoring';
import { pickPrompt, type CanvasPrompt } from '@/data/canvas/promptBanks';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { cn } from '@/lib/utils';

const DURATIONS = [5, 8, 10, 12, 15];
const REVEAL_MS = 3000;
const TITLE = 'Pass the Pencil';

interface Gain { word: string; points: number; artists: number }

export default function CanvasHostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { game, setGame, joinCode, players, strokes, guesses, live, loaded, refreshPlayers, markCorrect } = useCanvasGame(sessionId);
  const now = useNow();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [duration, setDuration] = useState(12);
  const [record, setRecord] = useState<number | null>(null);
  const [gains, setGains] = useState<Gain[]>([]);

  const token = sessionId ? sessionStorage.getItem(`canvas-host-${sessionId}`) : null;
  const gameRef = useRef<CanvasGame | null>(game);
  gameRef.current = game;
  const promptRef = useRef<CanvasPrompt | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const correctRef = useRef<{ playerId: string; at: number }[]>([]);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const waitingRef = useRef(false);
  const guessesRef = useRef(guesses);
  guessesRef.current = guesses;

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
    setGame(next);
    await canvasDb.from('canvas_games').update(fields).eq('id', g.id);
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
    const p = roster.find((r) => r.id === id)!;
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
      addition_index: 1, addition_seconds: TURN_SECONDS, round_artist_ids: [artistId], current_artist_id: artistId,
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
    setTimeout(async () => {
      if (timeIsUp()) { await finishGame(); return; }
      await startRound();
    }, REVEAL_MS);
  }, [finishGame, startRound]);

  const resolveSuccess = useCallback(async () => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || g.phase !== 'grace') return;
    busyRef.current = true;
    const ordered = [...correctRef.current].sort((a, b) => a.at - b.at);
    const awards = individualAwards(g.round_artist_ids, ordered.map((c) => c.playerId));
    const { data } = await canvasDb.from('players').select('id, canvas_score').in('id', awards.map((a) => a.playerId));
    await Promise.all(awards.map((a) => {
      const cur = (data as { id: string; canvas_score: number }[] | null)?.find((d) => d.id === a.playerId)?.canvas_score ?? 0;
      return canvasDb.from('players').update({ canvas_score: cur + a.points }).eq('id', a.playerId);
    }));
    const teamPts = teamPointsForTurn(g.addition_index);
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
    if (!g || g.phase !== 'drawing') return;
    busyRef.current = true;
    await saveDrawing(0);
    setGains((prev) => [{ word: promptRef.current?.text ?? '', points: 0, artists: g.round_artist_ids.length }, ...prev].slice(0, 6));
    await patch({ phase: 'reveal', last_result: result, revealed_answer: promptRef.current?.answer ?? '', last_points: 0 });
    afterReveal();
  }, [patch, afterReveal]);

  const passPencil = useCallback(async () => {
    const g = gameRef.current;
    if (!g || g.phase !== 'drawing') return;
    if (g.addition_index >= MAX_ARTISTS || timeIsUp()) { await resolveFail('fail'); return; }
    busyRef.current = true;
    const roster = await fetchRoster(g);
    const next = await assignArtist(roster, g.round_artist_ids);
    if (!next) { await resolveFail('fail'); return; }
    await patch({
      addition_index: g.addition_index + 1, current_artist_id: next, round_artist_ids: [...g.round_artist_ids, next],
      addition_started_at: new Date().toISOString(),
    });
    busyRef.current = false;
  }, [patch, resolveFail]);

  // Check incoming guesses
  useEffect(() => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || (g.phase !== 'drawing' && g.phase !== 'grace')) return;
    for (const guess of guesses) {
      if (processedRef.current.has(guess.id)) continue;
      processedRef.current.add(guess.id);
      if (guess.masterpiece_index !== g.masterpiece_index) continue;
      if (g.round_artist_ids.includes(guess.player_id) || g.current_artist_id === guess.player_id) continue;
      if (correctRef.current.some((c) => c.playerId === guess.player_id)) continue;
      if (!isCorrectGuess(guess.guess, prompt.answer, prompt.alternates)) continue;
      correctRef.current.push({ playerId: guess.player_id, at: new Date(guess.created_at).getTime() });
      markCorrect(guess.id, correctRef.current.length === 1 ? 100 : 40);
      if (!graceTimer.current && g.phase === 'drawing') {
        patch({ phase: 'grace' });
        graceTimer.current = setTimeout(() => { graceTimer.current = null; resolveSuccess(); }, EXTRA_GUESS_WINDOW_MS);
      }
    }
  }, [guesses, resolveSuccess, patch, markCorrect]);

  // Turn timeout + idle restart when players arrive
  useEffect(() => {
    if (!game || game.status !== 'playing' || busyRef.current) return;
    if (game.phase === 'drawing' && game.addition_started_at) {
      const end = new Date(game.addition_started_at).getTime() + game.addition_seconds * 1000;
      if (now >= end) passPencil();
    }
    if (game.phase === 'idle' && waitingRef.current && players.length > 1) { busyRef.current = true; startRound(); }
  }, [now, game, players.length, passPencil, startRound]);

  const startGame = async () => {
    if (!game) return;
    busyRef.current = true;
    await patch({
      status: 'playing', duration_seconds: duration * 60, team_score: 0, used_answers: [], words_attempted: 0, rescue_count: 0, total_additions: 0,
      game_ends_at: new Date(Date.now() + duration * 60_000).toISOString(),
    });
    await startRound(true);
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
      <QuizScreen eyebrow={`${TITLE} · Lobby`}>
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <section className="space-y-6">
            <p className="stage-kicker flex items-center gap-2"><Paintbrush className="h-4 w-4 text-primary" /> Co-op Pictionary relay</p>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">One word.<br />Three artists.<br /><span className="text-primary">One team.</span></h1>
            <p className="max-w-lg text-lg text-muted-foreground">An artist gets 30 seconds to draw a secret word. If nobody guesses it, the pencil passes to the next artist, who keeps drawing on the same picture. Words guessed later are worth more: 100, 200 or 300 team points.</p>
            <div className="stage-panel rounded-lg p-6">
              <p className="stage-kicker">Join at {url.replace(/^https?:\/\//, '')}</p>
              <p className="font-display text-8xl font-bold tracking-[0.15em] text-primary tabular-nums">{joinCode}</p>
            </div>
          </section>
          <section className="stage-panel flex flex-col rounded-lg p-6">
            <p className="stage-kicker flex items-center gap-2"><Users className="h-4 w-4" /> {players.length} players</p>
            <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">
              {players.map((p) => (
                <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="rounded-md border border-border px-3 py-1.5 font-semibold">{p.name}</motion.li>
              ))}
              {players.length === 0 && <li className="text-muted-foreground">Waiting for players…</li>}
            </ul>
            <div className="mt-6 border-t border-border pt-5">
              <p className="stage-kicker mb-3">Game length</p>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <Button key={d} size="sm" variant={duration === d ? 'default' : 'outline'} onClick={() => setDuration(d)}>{d} min</Button>
                ))}
              </div>
              <Button className="mt-5 w-full" size="lg" disabled={players.length < 2} onClick={startGame}>
                <Play /> {players.length < 2 ? 'Need at least 2 players' : 'Start drawing'}
              </Button>
            </div>
          </section>
        </div>
      </QuizScreen>
    );
  }

  const artist = players.find((p) => p.id === game.current_artist_id);
  const correctNow = guesses.filter((g) => g.is_correct && g.masterpiece_index === game.masterpiece_index);
  const ranked = [...players].sort((a, b) => b.canvas_score - a.canvas_score);
  const timeUp = secondsLeftOf(game, now) === 0;

  return (
    <QuizScreen eyebrow={`${TITLE} · Word ${game.masterpiece_index}`} corner={<span className="font-display text-xl font-bold tracking-widest text-primary">{joinCode}</span>}>
      <div className="mx-auto w-full max-w-[1700px] space-y-4 px-4 md:px-8">
        <CanvasStats game={game} now={now} record={record} />
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            <ArtistHandoff artist={artist} />
            <div className="flex items-center gap-4"><TurnPips game={game} /><div className="flex-1"><AdditionTimer game={game} now={now} /></div></div>
            {game.phase === 'grace' && <p className="text-sm font-bold text-secondary">{correctNow.length} got it! 2 seconds for anyone else…</p>}
            {timeUp && game.phase === 'drawing' && <p className="text-sm font-bold text-accent">Time's up — last turn!</p>}
            <div className="mx-auto w-full max-w-[calc((100vh-320px)*4/3)] min-w-[min(100%,640px)]">
            <div className="relative">
              <DrawingCanvas ref={canvasRef} strokes={strokes} live={live} className="rounded-md border-0" />
              <PassBanner game={game} artist={artist} now={now} />
              <NewWordBanner game={game} now={now} />
              <RevealBanner game={game} />
              {game.phase === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70"><p className="font-semibold">Waiting for at least 2 players…</p></div>
              )}
            </div>
            </div>
          </div>
          <aside className="space-y-5">
              <ContestantStage game={game} players={players} guesses={guesses} now={now} />
            <div className="stage-panel rounded-lg p-4">
              <p className="stage-kicker mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-secondary" /> Recent team gains</p>
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
            <div className="stage-panel rounded-lg p-4">
              <p className="stage-kicker mb-3">Players</p>
              <ol className="space-y-1.5">
                {ranked.map((p, i) => (
                  <li key={p.id} className={cn('flex items-center gap-2 text-sm', p.id === game.current_artist_id && 'font-bold')}>
                    <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="flex-1 truncate">{p.name}{p.id === game.current_artist_id && ' ✎'}</span>
                    <span className="tabular-nums text-muted-foreground">{p.canvas_score}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Button variant="outline" className="w-full" disabled={game.phase !== 'drawing'} onClick={() => resolveFail('skipped')}>
              <SkipForward /> Skip word
            </Button>
            <Button variant="ghost" className="w-full" onClick={finishGame}>End game now</Button>
          </aside>
        </div>
      </div>
    </QuizScreen>
  );
}

function secondsLeftOf(game: CanvasGame, now: number) {
  return game.game_ends_at ? Math.max(0, new Date(game.game_ends_at).getTime() - now) : 1;
}
