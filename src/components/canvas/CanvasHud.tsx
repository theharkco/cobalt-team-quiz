import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { MAX_ARTISTS, teamPointsForTurn } from '@/data/canvas/canvasScoring';
import { formatClock, secondsLeft } from '@/hooks/useCanvasGame';
import { cn } from '@/lib/utils';

export function CanvasStats({ game, now, record, compact }: { game: CanvasGame; now: number; record?: number | null; compact?: boolean }) {
  const remaining = secondsLeft(game.game_ends_at, null, now);
  const turn = Math.min(MAX_ARTISTS, game.addition_index);
  return (
    <div className={cn('grid items-end gap-3', compact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-5')}>
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
        <p className="stage-kicker">Artist {turn} of {MAX_ARTISTS}</p>
        <p className={cn('font-display font-bold tabular-nums text-primary', compact ? 'text-xl' : 'text-3xl')}>+{teamPointsForTurn(turn)}</p>
      </div>
      {!compact && (
        <>
          <div className="hidden md:block">
            <p className="stage-kicker">All-time high</p>
            <p className="font-display text-3xl font-bold tabular-nums text-muted-foreground">{record == null ? '—' : record.toLocaleString()}</p>
          </div>
          <div className="hidden md:block">
            <p className="stage-kicker">Word</p>
            <p className="font-display text-3xl font-bold tabular-nums text-muted-foreground">{game.masterpiece_index}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function TurnPips({ game }: { game: CanvasGame }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Artist ${game.addition_index} of ${MAX_ARTISTS}`}>
      {Array.from({ length: MAX_ARTISTS }, (_, i) => (
        <span key={i} className={cn('h-2 w-6 rounded-full', i < game.addition_index ? 'bg-primary' : 'bg-muted')} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {game.addition_index < MAX_ARTISTS ? `Pencil passes in ${game.addition_seconds}s turns` : 'Last artist!'}
      </span>
    </div>
  );
}

export function AdditionTimer({ game, now }: { game: CanvasGame; now: number }) {
  const active = game.phase === 'drawing';
  const left = active ? secondsLeft(game.addition_started_at, game.addition_seconds, now) : 0;
  const pct = active ? (left / game.addition_seconds) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-[width] duration-300', left <= 5 ? 'bg-accent' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('w-10 text-right font-display text-xl font-bold tabular-nums', left <= 5 && 'text-accent')}>{game.phase === 'grace' ? '✓' : left}</span>
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

/** "PASS THE PENCIL!" overlay for the first moments of turn 2 and 3. Drawing stays visible behind it. */
export function PassBanner({ game, artist, now, isMe }: { game: CanvasGame; artist?: CanvasPlayer; now: number; isMe?: boolean }) {
  const started = game.addition_started_at ? new Date(game.addition_started_at).getTime() : 0;
  const show = game.phase === 'drawing' && game.addition_index > 1 && now - started < 1800 && !!artist;
  return (
    <AnimatePresence>
      {show && (
        <motion.div key={`${game.masterpiece_index}-${game.addition_index}`} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto w-fit rounded-lg border border-primary bg-background/90 px-5 py-3 text-center backdrop-blur-sm">
          <p className="flex items-center justify-center gap-2 font-display text-2xl font-bold text-primary"><Pencil className="h-5 w-5" /> PASS THE PENCIL!</p>
          <p className="font-semibold" style={{ color: artist!.color }}>{isMe ? "You're up — keep drawing!" : `${artist!.name}, you're up!`}</p>
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
      <p className="stage-kicker">{success ? (game.addition_index >= 3 ? 'Rescued by artist 3!' : 'Guessed!') : game.last_result === 'skipped' ? 'Skipped' : 'Nobody got it'}</p>
      <p className="font-display text-4xl font-bold capitalize md:text-5xl">{game.revealed_answer}</p>
      {success
        ? <p className="font-display text-2xl font-bold text-secondary">+{game.last_points} team points</p>
        : <p className="text-muted-foreground">No points this time — next word coming up.</p>}
    </motion.div>
  );
}
