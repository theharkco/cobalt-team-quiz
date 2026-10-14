import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { CanvasGame, CanvasGuess, CanvasPlayer, CanvasStroke, LiveStroke, Point } from '@/types/canvas';

// Canvas tables are not in the generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const canvasDb = supabase as unknown as SupabaseClient<any>;

export function useCanvasGame(sessionId: string | undefined) {
  const [game, setGame] = useState<CanvasGame | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [players, setPlayers] = useState<CanvasPlayer[]>([]);
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [guesses, setGuesses] = useState<CanvasGuess[]>([]);
  const [live, setLive] = useState<Record<string, LiveStroke>>({});
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef<CanvasGame | null>(null);
  gameRef.current = game;

  const refreshPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await canvasDb.from('players').select('*').eq('session_id', sessionId).order('created_at');
    if (data) setPlayers(data as CanvasPlayer[]);
  }, [sessionId]);

  const refreshStrokes = useCallback(async (g: CanvasGame | null = gameRef.current) => {
    if (!g) return;
    const { data } = await canvasDb.from('canvas_strokes').select('*')
      .eq('game_id', g.id).eq('masterpiece_index', g.masterpiece_index).order('created_at');
    if (data) {
      setStrokes(data as CanvasStroke[]);
      setLive((prev) => {
        const ids = new Set((data as CanvasStroke[]).map((s) => s.id));
        const next: Record<string, LiveStroke> = {};
        for (const [k, v] of Object.entries(prev)) if (!ids.has(k)) next[k] = v;
        return next;
      });
    }
  }, []);

  const refreshGuesses = useCallback(async (g: CanvasGame | null = gameRef.current) => {
    if (!g) return;
    const { data } = await canvasDb.from('canvas_guesses').select('*').eq('game_id', g.id).order('created_at');
    if (data) setGuesses((prev) => mergeGuesses(prev, data as CanvasGuess[]));
  }, []);

  const refreshGame = useCallback(async () => {
    if (!sessionId) return null;
    const { data } = await canvasDb.from('canvas_games').select('*').eq('session_id', sessionId).maybeSingle();
    if (data) setGame(data as CanvasGame);
    return data as CanvasGame | null;
  }, [sessionId]);

  // Initial load + subscriptions
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const { data: s } = await canvasDb.from('quiz_sessions').select('join_code').eq('id', sessionId).maybeSingle();
      if (s && !cancelled) setJoinCode((s as { join_code: string }).join_code);
      const g = await refreshGame();
      await refreshPlayers();
      if (g) { await refreshStrokes(g); await refreshGuesses(g); }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [sessionId, refreshGame, refreshPlayers, refreshStrokes, refreshGuesses]);

  const gameId = game?.id;
  useEffect(() => {
    if (!sessionId) return;
    const ch = canvasDb.channel(`canvas-${sessionId}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` }, () => refreshPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_games', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.new && 'id' in payload.new) setGame(payload.new as CanvasGame);
      });
    if (gameId) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_strokes', filter: `game_id=eq.${gameId}` }, () => refreshStrokes())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_guesses', filter: `game_id=eq.${gameId}` }, () => refreshGuesses());
    }
    ch.on('broadcast', { event: 'live' }, ({ payload }) => {
      const s = payload as LiveStroke & { done?: boolean };
      setLive((prev) => ({ ...prev, [s.key]: s }));
    }).on('broadcast', { event: 'strokes' }, () => refreshStrokes())
      .on('broadcast', { event: 'guess' }, ({ payload }) => {
        const gs = payload as CanvasGuess;
        setGuesses((prev) => (prev.some((x) => x.id === gs.id) ? prev : [...prev, gs]));
      })
      .on('broadcast', { event: 'correct' }, ({ payload }) => {
        const { id, points } = payload as { id: string; points: number };
        setGuesses((prev) => prev.map((x) => (x.id === id ? { ...x, verdict: 'correct', is_correct: true, points_earned: points } : x)));
      })
      .on('broadcast', { event: 'incorrect' }, ({ payload }) => {
        const { id } = payload as { id: string };
        setGuesses((prev) => prev.map((x) => x.id === id && !x.is_correct ? { ...x, verdict: 'incorrect' } : x));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { canvasDb.removeChannel(ch); channelRef.current = null; };
  }, [sessionId, gameId, refreshPlayers, refreshStrokes, refreshGuesses]);

  // Reload strokes when masterpiece changes
  const mp = game?.masterpiece_index;
  useEffect(() => {
    if (game) { setLive({}); refreshStrokes(game); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp, gameId]);

  const lastSend = useRef(0);
  const sendLive = useCallback((stroke: LiveStroke, force = false) => {
    setLive((prev) => ({ ...prev, [stroke.key]: stroke }));
    const now = Date.now();
    if (!force && now - lastSend.current < 50) return;
    lastSend.current = now;
    channelRef.current?.send({ type: 'broadcast', event: 'live', payload: stroke });
  }, []);

  const commitStroke = useCallback(async (artistId: string, color: string, width: number, points: Point[]) => {
    const g = gameRef.current;
    if (!g) return;
    const id = crypto.randomUUID();
    const s: LiveStroke = { key: id, color, width, points };
    sendLive(s, true);
    await canvasDb.from('canvas_strokes').insert({
      id, game_id: g.id, masterpiece_index: g.masterpiece_index, addition_index: g.addition_index,
      artist_id: artistId, color, width, points,
    });
    channelRef.current?.send({ type: 'broadcast', event: 'strokes', payload: {} });
    await refreshStrokes();
  }, [sendLive, refreshStrokes]);

  const removeStrokes = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const drop = new Set(ids);
    setStrokes((prev) => prev.filter((s) => !drop.has(s.id)));
    await canvasDb.from('canvas_strokes').delete().in('id', ids);
    channelRef.current?.send({ type: 'broadcast', event: 'strokes', payload: {} });
    await refreshStrokes();
  }, [refreshStrokes]);

  /** Broadcast first (instant for everyone), then persist. */
  const sendGuess = useCallback(async (playerId: string, text: string) => {
    const g = gameRef.current;
    if (!g) return;
    const row: CanvasGuess = {
      id: crypto.randomUUID(), game_id: g.id, player_id: playerId, masterpiece_index: g.masterpiece_index,
      addition_index: g.addition_index, guess: text, is_correct: false, points_earned: 0, created_at: new Date().toISOString(),
    };
    setGuesses((prev) => [...prev, row]);
    channelRef.current?.send({ type: 'broadcast', event: 'guess', payload: row });
    await canvasDb.from('canvas_guesses').insert(row);
  }, []);

  /** Host only: tell everyone instantly, then persist. */
  const markCorrect = useCallback(async (id: string, points: number) => {
    setGuesses((prev) => prev.map((x) => (x.id === id ? { ...x, verdict: 'correct', is_correct: true, points_earned: points } : x)));
    channelRef.current?.send({ type: 'broadcast', event: 'correct', payload: { id, points } });
    await canvasDb.from('canvas_guesses').update({ is_correct: true, points_earned: points }).eq('id', id);
  }, []);

  const markIncorrect = useCallback((id: string) => {
    setGuesses((prev) => prev.map((x) => x.id === id && !x.is_correct ? { ...x, verdict: 'incorrect' } : x));
    channelRef.current?.send({ type: 'broadcast', event: 'incorrect', payload: { id } });
  }, []);

  return {
    removeStrokes, sendGuess, markCorrect, markIncorrect,
    game, setGame, joinCode, players, strokes, guesses, loaded,
    live: Object.values(live),
    refreshGame, refreshPlayers, refreshStrokes, refreshGuesses, sendLive, commitStroke, setLive,
  };
}

export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}

export const secondsLeft = (iso: string | null, totalSeconds: number | null, now: number) => {
  if (!iso) return 0;
  const end = totalSeconds == null ? new Date(iso).getTime() : new Date(iso).getTime() + totalSeconds * 1000;
  return Math.max(0, Math.ceil((end - now) / 1000));
};

export const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Keep broadcast-only guesses and correct flags that the database hasn't caught up with yet. */
export function mergeGuesses(local: CanvasGuess[], db: CanvasGuess[]): CanvasGuess[] {
  const byId = new Map(local.map((g) => [g.id, g]));
  const out = db.map((d) => {
    const l = byId.get(d.id);
    return l?.is_correct && !d.is_correct
      ? { ...d, verdict: 'correct', is_correct: true, points_earned: l.points_earned }
      : { ...d, verdict: d.is_correct ? 'correct' : l?.verdict };
  });
  const ids = new Set(db.map((d) => d.id));
  for (const l of local) if (!ids.has(l.id) && l.game_id === db[0]?.game_id) out.push(l);
  if (!db.length) return local;
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
