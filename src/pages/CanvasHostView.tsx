import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Paintbrush, Play, RefreshCw, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import QuizScreen from '@/components/quiz/QuizScreen';
import { Button } from '@/components/ui/button';
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/canvas/DrawingCanvas';
import CanvasResults from '@/components/canvas/CanvasResults';
import { AdditionTimer, ArtistHandoff, CanvasStats, RevealBanner, SceneTrail } from '@/components/canvas/CanvasHud';
import { canvasDb, useCanvasGame, useNow } from '@/hooks/useCanvasGame';
import { EXTRA_GUESS_WINDOW_MS, individualAwards, isCorrectGuess, pickArtist, teamPointsForAddition } from '@/data/canvas/canvasScoring';
import { pickPrompt, type CanvasPrompt } from '@/data/canvas/promptBanks';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { cn } from '@/lib/utils';

const DURATIONS = [5, 8, 10, 12, 15, 20];
const REVEAL_MS = 3500;

export default function CanvasHostView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { game, setGame, joinCode, players, strokes, guesses, live, loaded, refreshPlayers } = useCanvasGame(sessionId);
  const now = useNow();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [duration, setDuration] = useState(12);
  const [record, setRecord] = useState<number | null>(null);

  const token = sessionId ? sessionStorage.getItem(`canvas-host-${sessionId}`) : null;
  const gameRef = useRef<CanvasGame | null>(game);
  gameRef.current = game;
  const playersRef = useRef<CanvasPlayer[]>(players);
  playersRef.current = players;
  const promptRef = useRef<CanvasPrompt | null>(null);
  const usedAnswersRef = useRef<string[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const correctRef = useRef<{ playerId: string; at: number }[]>([]);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    canvasDb.from('canvas_games').select('team_score').eq('status', 'finished').order('team_score', { ascending: false }).limit(1)
      .then(({ data }) => setRecord(data && data.length ? (data[0] as { team_score: number }).team_score : 0));
  }, []);

  // Recover the secret prompt after a host refresh
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

  const beginAddition = useCallback(async () => {
    const g = gameRef.current;
    if (!g || !token) return;
    const { data } = await canvasDb.from('players').select('*').eq('session_id', g.session_id);
    const roster = (data ?? []) as CanvasPlayer[];
    const artistId = pickArtist(roster, g.current_artist_id ?? g.last_artist_id);
    if (!artistId) { await patch({ phase: 'idle' }); return; }
    const prompt = pickPrompt(g.addition_index, usedAnswersRef.current);
    promptRef.current = prompt;
    processedRef.current = new Set(guesses.map((x) => x.id));
    correctRef.current = [];
    await canvasDb.rpc('set_canvas_prompt', { _game_id: g.id, _host_token: token, _prompt: prompt.text, _answer: prompt.answer, _alternates: prompt.alternates ?? [] });
    const artist = roster.find((p) => p.id === artistId)!;
    await canvasDb.from('players').update({ draw_count: artist.draw_count + 1 }).eq('id', artistId);
    await patch({
      phase: 'drawing', current_artist_id: artistId, last_artist_id: g.current_artist_id,
      addition_started_at: new Date().toISOString(), revealed_answer: null, last_result: null, last_points: 0,
    });
    busyRef.current = false;
  }, [token, patch, guesses]);

  const saveMasterpiece = useCallback(async () => {
    const g = gameRef.current;
    if (!g || g.scene.length === 0) return;
    let points = 0;
    for (let i = 1; i <= g.scene.length; i++) points += teamPointsForAddition(i);
    await canvasDb.from('canvas_masterpieces').insert({
      game_id: g.id, masterpiece_index: g.masterpiece_index, scene: g.scene,
      additions: g.scene.length, points, image_data: canvasRef.current?.toDataURL() ?? null,
    });
  }, []);

  const finishGame = useCallback(async () => {
    await saveMasterpiece();
    await patch({ status: 'finished', phase: 'idle', current_artist_id: null });
  }, [saveMasterpiece, patch]);

  const startNewMasterpiece = useCallback(async () => {
    await saveMasterpiece();
    if (timeIsUp()) { await finishGame(); return; }
    const g = gameRef.current!;
    usedAnswersRef.current = [];
    await patch({ masterpiece_index: g.masterpiece_index + 1, addition_index: 1, scene: [] });
    await beginAddition();
  }, [saveMasterpiece, finishGame, patch, beginAddition]);

  const resolveSuccess = useCallback(async () => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || g.phase !== 'drawing' || !g.current_artist_id) return;
    busyRef.current = true;
    const ordered = [...correctRef.current].sort((a, b) => a.at - b.at);
    const startedAt = new Date(g.addition_started_at ?? Date.now()).getTime();
    const awards = individualAwards(g.current_artist_id, ordered.map((c) => c.playerId), ordered[0].at - startedAt);
    const { data } = await canvasDb.from('players').select('id, canvas_score').in('id', awards.map((a) => a.playerId));
    await Promise.all(awards.map((a) => {
      const cur = (data as { id: string; canvas_score: number }[] | null)?.find((d) => d.id === a.playerId)?.canvas_score ?? 0;
      return canvasDb.from('players').update({ canvas_score: cur + a.points }).eq('id', a.playerId);
    }));
    const teamPts = teamPointsForAddition(g.addition_index);
    usedAnswersRef.current = [...usedAnswersRef.current, prompt.answer];
    await patch({
      phase: 'reveal', last_result: 'success', revealed_answer: prompt.answer, last_points: teamPts,
      team_score: g.team_score + teamPts, total_additions: g.total_additions + 1, scene: [...g.scene, prompt.text],
    });
    refreshPlayers();
    setTimeout(async () => {
      if (timeIsUp()) { await finishGame(); return; }
      await patch({ addition_index: (gameRef.current?.addition_index ?? 1) + 1 });
      await beginAddition();
    }, REVEAL_MS);
  }, [patch, refreshPlayers, finishGame, beginAddition]);

  const resolveFail = useCallback(async (result: 'fail' | 'skipped') => {
    const g = gameRef.current;
    if (!g || g.phase !== 'drawing') return;
    busyRef.current = true;
    if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
    await patch({ phase: 'reveal', last_result: result, revealed_answer: promptRef.current?.answer ?? '', last_points: 0 });
    setTimeout(() => { startNewMasterpiece(); }, REVEAL_MS);
  }, [patch, startNewMasterpiece]);

  // Check incoming guesses
  useEffect(() => {
    const g = gameRef.current;
    const prompt = promptRef.current;
    if (!g || !prompt || g.phase !== 'drawing' || busyRef.current) return;
    for (const guess of guesses) {
      if (processedRef.current.has(guess.id)) continue;
      processedRef.current.add(guess.id);
      if (guess.masterpiece_index !== g.masterpiece_index || guess.addition_index !== g.addition_index) continue;
      if (guess.player_id === g.current_artist_id) continue;
      if (correctRef.current.some((c) => c.playerId === guess.player_id)) continue;
      if (!isCorrectGuess(guess.guess, prompt.answer, prompt.alternates)) continue;
      correctRef.current.push({ playerId: guess.player_id, at: new Date(guess.created_at).getTime() });
      canvasDb.from('canvas_guesses').update({ is_correct: true, points_earned: correctRef.current.length === 1 ? 100 : 30 }).eq('id', guess.id);
      if (!graceTimer.current) {
        graceTimer.current = setTimeout(() => { graceTimer.current = null; resolveSuccess(); }, EXTRA_GUESS_WINDOW_MS);
      }
    }
  }, [guesses, resolveSuccess]);

  // Addition timeout + idle restart when players arrive
  useEffect(() => {
    if (!game || game.status !== 'playing' || busyRef.current) return;
    if (game.phase === 'drawing' && game.addition_started_at && !graceTimer.current) {
      const end = new Date(game.addition_started_at).getTime() + game.addition_seconds * 1000;
      if (now >= end) resolveFail('fail');
    }
    if (game.phase === 'idle' && players.length > 0) { busyRef.current = true; beginAddition(); }
  }, [now, game, players.length, resolveFail, beginAddition]);

  const startGame = async () => {
    if (!game) return;
    busyRef.current = true;
    await patch({
      status: 'playing', duration_seconds: duration * 60,
      game_ends_at: new Date(Date.now() + duration * 60_000).toISOString(),
    });
    await beginAddition();
  };

  if (!loaded) return <QuizScreen eyebrow="Infinite Canvas"><p className="text-muted-foreground">Loading…</p></QuizScreen>;
  if (!game) return <QuizScreen eyebrow="Infinite Canvas"><p>Game not found.</p></QuizScreen>;
  if (!token) return <QuizScreen eyebrow="Infinite Canvas"><p>This screen isn't the host for this game.</p></QuizScreen>;

  if (game.status === 'finished') {
    return <QuizScreen eyebrow="Infinite Canvas · Final"><CanvasResults game={game} players={players} /></QuizScreen>;
  }

  if (game.status === 'lobby') {
    const url = `${window.location.origin}`;
    return (
      <QuizScreen eyebrow="Infinite Canvas · Lobby">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <section className="space-y-6">
            <p className="stage-kicker flex items-center gap-2"><Paintbrush className="h-4 w-4 text-primary" /> Co-op drawing game</p>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">Draw it. Guess it.<br /><span className="text-primary">Make it weirder.</span></h1>
            <p className="max-w-lg text-lg text-muted-foreground">One person draws, everyone else guesses. Each correct guess adds to the same picture and is worth more points. If a guess isn't found in time, a new picture begins.</p>
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
                  className="rounded-md border border-border px-3 py-1.5 font-semibold" style={{ color: p.color }}>{p.name}</motion.li>
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
  const currentCorrect = guesses.filter((g) => g.is_correct && g.masterpiece_index === game.masterpiece_index && g.addition_index === game.addition_index);
  const recent = guesses.filter((g) => g.is_correct).slice(-6).reverse();
  const ranked = [...players].sort((a, b) => b.canvas_score - a.canvas_score);
  const nameOf = (id: string) => players.find((p) => p.id === id);

  return (
    <QuizScreen eyebrow={`Masterpiece ${game.masterpiece_index}`} corner={<span className="font-display text-xl font-bold tracking-widest text-primary">{joinCode}</span>}>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <CanvasStats game={game} now={now} record={record} />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <SceneTrail scene={game.scene} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ArtistHandoff artist={artist} />
              {currentCorrect.length > 0 && game.phase === 'drawing' && (
                <span className="text-sm font-bold text-secondary">{currentCorrect.length} got it — last chance for others!</span>
              )}
            </div>
            <AdditionTimer game={game} now={now} />
            <div className="relative">
              <DrawingCanvas ref={canvasRef} strokes={strokes} live={live} />
              <RevealBanner game={game} />
              {game.phase === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70"><p className="font-semibold">Waiting for players…</p></div>
              )}
            </div>
          </div>
          <aside className="space-y-5">
            <div className="stage-panel rounded-lg p-4">
              <p className="stage-kicker mb-3">Leaderboard</p>
              <ol className="space-y-1.5">
                {ranked.map((p, i) => (
                  <li key={p.id} className={cn('flex items-center gap-2 text-sm', p.id === game.current_artist_id && 'font-bold')}>
                    <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="flex-1 truncate">{p.name}{p.id === game.current_artist_id && ' ✎'}</span>
                    <span className="tabular-nums text-muted-foreground">{p.canvas_score}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="stage-panel rounded-lg p-4">
              <p className="stage-kicker mb-3">Recent correct guesses</p>
              {recent.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              <ul className="space-y-1.5">
                {recent.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span style={{ color: nameOf(g.player_id)?.color }} className="font-semibold">{nameOf(g.player_id)?.name}</span>
                    <span className="ml-auto text-muted-foreground">+{g.points_earned}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="outline" className="w-full" disabled={game.phase !== 'drawing'} onClick={() => resolveFail('skipped')}>
              <RefreshCw /> Start a new masterpiece
            </Button>
            <Button variant="ghost" className="w-full" onClick={finishGame}>End game now</Button>
          </aside>
        </div>
      </div>
    </QuizScreen>
  );
}
