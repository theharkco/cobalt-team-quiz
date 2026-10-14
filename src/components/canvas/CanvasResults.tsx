import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Trophy } from 'lucide-react';
import { canvasDb } from '@/hooks/useCanvasGame';
import type { CanvasGame, CanvasMasterpiece, CanvasPlayer } from '@/types/canvas';
import { sceneSentence } from '@/data/canvas/promptBanks';

interface Props { game: CanvasGame; players: CanvasPlayer[]; compact?: boolean }

export default function CanvasResults({ game, players, compact }: Props) {
  const [pieces, setPieces] = useState<CanvasMasterpiece[]>([]);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  useEffect(() => {
    canvasDb.from('canvas_masterpieces').select('*').eq('game_id', game.id).order('masterpiece_index')
      .then(({ data }) => data && setPieces(data as CanvasMasterpiece[]));
    canvasDb.from('canvas_games').select('team_score').eq('status', 'finished').neq('id', game.id)
      .order('team_score', { ascending: false }).limit(1)
      .then(({ data }) => setPreviousBest(data && data.length ? (data[0] as { team_score: number }).team_score : 0));
  }, [game.id]);

  const ranked = [...players].sort((a, b) => b.canvas_score - a.canvas_score);
  const mvp = ranked[0];
  const longest = pieces.reduce((m, p) => Math.max(m, p.additions), 0);
  const beatRecord = previousBest !== null && game.team_score > previousBest;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <motion.section initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="stage-panel rounded-lg p-6 text-center md:p-10">
        <p className="stage-kicker">Team score</p>
        <p className="font-display text-[clamp(3.5rem,10vw,7rem)] font-bold leading-none text-secondary tabular-nums">{game.team_score.toLocaleString()}</p>
        <p className="mt-3 font-semibold text-muted-foreground">
          {previousBest === null ? ' ' : beatRecord ? 'New team record!' : `Record to beat: ${previousBest.toLocaleString()}`}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-6">
          <Stat label="Additions guessed" value={game.total_additions} />
          <Stat label="Masterpieces" value={pieces.length} />
          <Stat label="Longest masterpiece" value={longest} />
        </div>
      </motion.section>

      <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <div className="stage-panel rounded-lg p-6">
          <p className="stage-kicker flex items-center gap-2"><Crown className="h-4 w-4 text-secondary" /> MVP of the Week</p>
          <p className="mt-2 font-display text-4xl font-bold" style={{ color: mvp?.color }}>{mvp?.name ?? '—'}</p>
          <p className="text-muted-foreground tabular-nums">{mvp?.canvas_score ?? 0} points</p>
          <ol className="mt-6 space-y-2">
            {ranked.slice(0, compact ? 3 : 10).map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-border pb-2 last:border-0">
                <span className="w-6 font-display font-bold text-muted-foreground tabular-nums">{i < 3 ? <Medal className="h-4 w-4 text-primary" /> : i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="flex-1 truncate font-semibold">{p.name}</span>
                <span className="tabular-nums text-muted-foreground">{p.canvas_score}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-3">
          <p className="stage-kicker flex items-center gap-2"><Trophy className="h-4 w-4" /> Masterpiece gallery</p>
          {pieces.length === 0 && <p className="text-muted-foreground">No masterpieces were finished this time.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {pieces.map((p) => (
              <figure key={p.id} className="stage-panel overflow-hidden rounded-lg">
                {p.image_data && <img src={p.image_data} alt={sceneSentence(p.scene)} className="aspect-[4/3] w-full object-cover" />}
                <figcaption className="space-y-1 p-3">
                  <p className="font-semibold leading-snug">{sceneSentence(p.scene) || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{p.additions} additions · {p.points} points</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
