import { AnimatePresence, motion } from 'framer-motion';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { teamPointsForAddition } from '@/data/canvas/canvasScoring';
import { formatClock, secondsLeft } from '@/hooks/useCanvasGame';
import { cn } from '@/lib/utils';

export function CanvasStats({ game, now, record, compact }: { game: CanvasGame; now: number; record?: number | null; compact?: boolean }) {
  const remaining = secondsLeft(game.game_ends_at, null, now);
  return (
    <div className={cn('grid items-end gap-3', compact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4')}>
      <div className={cn(compact ? 'col-span-1' : 'col-span-2 md:col-span-1')}>
        <p className="stage-kicker">Team score</p>
        <motion.p key={game.team_score} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
          className={cn('font-display font-bold leading-none text-secondary tabular-nums', compact ? 'text-3xl' : 'text-5xl md:text-6xl')}>
          {game.team_score.toLocaleString()}
        </motion.p>
      </div>
      <div>
        <p className="stage-kicker">Game time</p>
        <p className={cn('font-display font-bold tabular-nums', compact ? 'text-xl' : 'text-3xl', remaining <= 30 && 'text-accent')}>{formatClock(remaining)}</p>
      </div>
      <div>
        <p className="stage-kicker">Addition {game.addition_index}</p>
        <p className={cn('font-display font-bold tabular-nums text-primary', compact ? 'text-xl' : 'text-3xl')}>+{teamPointsForAddition(game.addition_index)}</p>
      </div>
      {!compact && (
        <div className="hidden md:block">
          <p className="stage-kicker">Team record</p>
          <p className="font-display text-3xl font-bold tabular-nums text-muted-foreground">{record == null ? '—' : record.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

export function SceneTrail({ scene }: { scene: string[] }) {
  if (!scene.length) return <p className="text-sm text-muted-foreground">Fresh canvas — the first drawing starts the scene.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {scene.map((s, i) => (
        <motion.span key={`${i}-${s}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="rounded-md border border-border bg-muted px-2.5 py-1 text-sm font-semibold">
          <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>{s}
        </motion.span>
      ))}
    </div>
  );
}

export function AdditionTimer({ game, now }: { game: CanvasGame; now: number }) {
  const left = game.phase === 'drawing' ? secondsLeft(game.addition_started_at, game.addition_seconds, now) : 0;
  const pct = game.phase === 'drawing' ? (left / game.addition_seconds) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-[width] duration-300', left <= 10 ? 'bg-accent' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('w-10 text-right font-display text-xl font-bold tabular-nums', left <= 10 && 'text-accent')}>{left}</span>
    </div>
  );
}

export function ArtistHandoff({ artist }: { artist: CanvasPlayer | undefined }) {
  return (
    <AnimatePresence mode="wait">
      {artist && (
        <motion.div key={artist.id} initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.35 }} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: artist.color }} />
          <span className="stage-kicker">Now drawing</span>
          <span className="font-display text-lg font-bold" style={{ color: artist.color }}>{artist.name}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RevealBanner({ game }: { game: CanvasGame }) {
  if (game.phase !== 'reveal' || !game.last_result) return null;
  const success = game.last_result === 'success';
  return (
    <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 p-4 text-center backdrop-blur-sm">
      <p className="stage-kicker">{success ? 'Guessed!' : game.last_result === 'skipped' ? 'New masterpiece' : "Time's up"}</p>
      <p className="font-display text-4xl font-bold capitalize md:text-5xl">{game.revealed_answer}</p>
      {success
        ? <p className="font-display text-2xl font-bold text-secondary">+{game.last_points} team points</p>
        : <p className="text-muted-foreground">Starting a fresh canvas — your points are safe.</p>}
    </motion.div>
  );
}
