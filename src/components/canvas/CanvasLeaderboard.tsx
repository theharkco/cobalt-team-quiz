import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { canvasDb } from '@/hooks/useCanvasGame';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';

export function rankPersonalBests(players: Pick<CanvasPlayer, 'id' | 'name' | 'canvas_score'>[]) {
  const best = new Map<string, Pick<CanvasPlayer, 'id' | 'name' | 'canvas_score'>>();
  for (const player of players) {
    const key = player.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (player.canvas_score > (best.get(key)?.canvas_score ?? -1)) best.set(key, player);
  }
  return [...best.values()].sort((a, b) => b.canvas_score - a.canvas_score || a.name.localeCompare(b.name)).slice(0, 10);
}

async function loadRecords() {
  const games: { session_id: string; team_score: number }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await canvasDb.from('canvas_games').select('session_id, team_score').eq('status', 'finished').order('id').range(offset, offset + 999);
    if (error) throw error;
    games.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  const people: Pick<CanvasPlayer, 'id' | 'name' | 'canvas_score'>[] = [];
  for (let start = 0; start < games.length; start += 100) {
    const ids = games.slice(start, start + 100).map((g) => g.session_id);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await canvasDb.from('players').select('id, name, canvas_score').in('session_id', ids).order('id').range(offset, offset + 999);
      if (error) throw error;
      people.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return { teamBest: Math.max(0, ...games.map((g) => g.team_score)), ranked: rankPersonalBests(people.filter((p) => p.canvas_score > 0)) };
}

export default function CanvasLeaderboard({ game, players }: { game: CanvasGame; players: CanvasPlayer[] }) {
  const [view, setView] = useState('all-time');
  const records = useQuery({ queryKey: ['pencil-records', game.id, game.status], queryFn: loadRecords, staleTime: 15000, refetchInterval: 30000 });
  const ranked = view === 'all-time' ? records.data?.ranked ?? [] : [...players].sort((a, b) => b.canvas_score - a.canvas_score || a.name.localeCompare(b.name)).slice(0, 10);
  return (
    <section aria-label="Pencil leaderboard" className="border-t border-border py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Trophy className="h-5 w-5 text-secondary" /> Leaderboard</h2>
        <Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="all-time">All-time</TabsTrigger><TabsTrigger value="this-game">This game</TabsTrigger></TabsList></Tabs>
      </div>
      <div className="grid gap-6 sm:grid-cols-[1fr_2fr]">
        <div>
          <p className="stage-kicker">Highest team score</p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums text-secondary">{records.isError ? '—' : records.data ? records.data.teamBest.toLocaleString() : '…'}</p>
          <p className="mt-2 text-xs text-muted-foreground">Completed games · all-time best</p>
          <p className="mt-4 text-sm text-muted-foreground">This team <b className="text-foreground tabular-nums">{game.team_score.toLocaleString()} pts</b></p>
        </div>
        <div>
          <h3 className="mb-3 font-bold">Top 10 individuals</h3>
          {view === 'all-time' && records.isPending && <p className="text-sm text-muted-foreground">Loading scores…</p>}
          {view === 'all-time' && records.isError && <p role="alert" className="text-sm text-destructive">Couldn’t load records. Trying again shortly.</p>}
          {!ranked.length && !(view === 'all-time' && (records.isPending || records.isError)) && <p className="text-sm text-muted-foreground">No scores yet.</p>}
          <ol className="grid gap-x-6 sm:grid-cols-2">
            {ranked.map((p, i) => <li key={p.id} className="flex min-w-0 items-center gap-3 border-b border-border/60 py-2">
              <span className="w-5 shrink-0 text-sm font-bold tabular-nums text-primary">{i + 1}</span>
              <span className="min-w-0 flex-1 break-words text-sm font-semibold">{p.name}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{p.canvas_score.toLocaleString()}</span>
            </li>)}
          </ol>
          {view === 'all-time' && <p className="mt-3 text-xs text-muted-foreground">Best completed-game score per player name.</p>}
        </div>
      </div>
    </section>
  );
}