import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';
import { MAX_ARTISTS, PEN_COLORS, PEN_WIDTHS, teamPointsForTurn } from '@/data/canvas/canvasScoring';
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
        <p className={cn('font-display font-bold tabular-nums text-primary', compact ? 'text-xl' : 'text-3xl')}>+{teamPointsForTurn(turn, game.addition_seconds)}</p>
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
        {game.addition_index < MAX_ARTISTS ? `${game.addition_seconds}s turns` : 'Last artist!'}
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
        <motion.div key={artist.id} initial={{ x: -40, opacity: 0, scale: 0.9 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }} className="flex items-center gap-2">
          <motion.span animate={{ rotate: [0, -18, 12, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6, repeatDelay: 0.6 }}>
            <Pencil className="h-5 w-5 text-primary" />
          </motion.span>
          <span className="font-display text-2xl font-bold">{artist.name}</span>
          <span className="stage-kicker">is drawing</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PASS_MS = 2800;
const NEW_WORD_MS = 2600;

/** Big full-canvas "PASS THE PENCIL!" moment for turns 2 and 3. */
export function PassBanner({ game, artist, now, isMe }: { game: CanvasGame; artist?: CanvasPlayer; now: number; isMe?: boolean }) {
  const started = game.addition_started_at ? new Date(game.addition_started_at).getTime() : 0;
  const show = game.phase === 'drawing' && game.addition_index > 1 && now - started < PASS_MS && !!artist;
  return (
    <AnimatePresence>
      {show && (
        <motion.div key={`pass-${game.masterpiece_index}-${game.addition_index}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-primary/85 text-primary-foreground backdrop-blur-sm">
          <motion.div initial={{ x: '-120%', rotate: -40 }} animate={{ x: ['-120%', '0%', '0%', '120%'], rotate: [-40, 0, 0, 40] }}
            transition={{ duration: PASS_MS / 1000, times: [0, 0.2, 0.8, 1], ease: 'easeInOut' }}>
            <Pencil className="h-8 w-8 sm:h-16 sm:w-16" />
          </motion.div>
          <motion.p initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: [0.3, 1.25, 1], rotate: [-8, 4, -2] }} transition={{ duration: 0.6, type: 'spring' }}
            className="mt-2 px-2 text-center font-display text-xl font-black sm:text-4xl lg:text-6xl">PASS THE PENCIL!</motion.p>
          <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, type: 'spring', bounce: 0.6 }}
            className="mt-2 px-2 text-center font-display text-sm font-bold sm:text-2xl lg:text-4xl">{isMe ? "You're up!" : `${artist?.name}, you're up!`}</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-1 px-2 text-center text-xs font-semibold sm:text-base">
            Artist {game.addition_index} of {MAX_ARTISTS} · now worth +{teamPointsForTurn(game.addition_index, game.addition_seconds)}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Clear "new word" moment at the start of every round. */
export function NewWordBanner({ game, now, isMe }: { game: CanvasGame; now: number; isMe?: boolean }) {
  const started = game.addition_started_at ? new Date(game.addition_started_at).getTime() : 0;
  const show = game.phase === 'drawing' && game.addition_index === 1 && now - started < NEW_WORD_MS;
  return (
    <AnimatePresence>
      {show && (
        <motion.div key={`word-${game.masterpiece_index}`} initial={{ clipPath: 'circle(0% at 50% 50%)' }} animate={{ clipPath: 'circle(150% at 50% 50%)' }}
          exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-secondary text-secondary-foreground">
          <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="stage-kicker text-secondary-foreground/80">Fresh canvas</motion.p>
          <motion.p initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.25, duration: 0.6 }}
            className="font-display text-3xl font-black sm:text-6xl lg:text-8xl">Word {game.masterpiece_index}</motion.p>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, type: 'spring' }}
            className="mt-2 px-2 text-center font-display text-sm font-bold sm:text-2xl">{isMe ? 'You start — get drawing!' : 'Get ready to guess!'}</motion.p>
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
      <p className="break-words font-display text-2xl font-bold capitalize sm:text-4xl md:text-5xl">{game.revealed_answer}</p>
      {success
        ? <p className="font-display text-sm font-bold text-secondary sm:text-2xl">+{game.last_points} team points</p>
        : <p className="text-xs text-muted-foreground sm:text-base">No points this time — next word coming up.</p>}
    </motion.div>
  );
}

/** Banner shown only on the drawing player's phone. */
export function ArtistBanner({ turn, word }: { turn: number; word?: string }) {
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
      className="relative overflow-hidden rounded-xl border-2 border-primary bg-primary/10 p-4 text-center">
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }} />
      <div className="relative flex items-center justify-center gap-2">
        <motion.span animate={{ rotate: [0, -15, 10, 0] }} transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0.8 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Pencil className="h-4 w-4" />
        </motion.span>
        <p className="stage-kicker">You're drawing · Artist {turn} of {MAX_ARTISTS} · Secret word</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={word ?? '…'} initial={{ rotateX: 90, opacity: 0, scale: 0.7 }} animate={{ rotateX: 0, opacity: 1, scale: [0.7, 1.12, 1] }}
          transition={{ duration: 0.6 }}
          className="relative mt-1 break-words font-display text-5xl font-bold uppercase tracking-wide text-primary drop-shadow-[0_0_18px_hsl(var(--primary)/0.6)] sm:text-6xl">
          {word ?? '…'}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

/** Canvas wrapper; highlighted only for the active artist. */
export function ArtistFrame({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <motion.div animate={active ? { boxShadow: ['0 0 0 0 hsl(var(--primary) / 0.5)', '0 0 0 8px hsl(var(--primary) / 0)'] } : { boxShadow: '0 0 0 0 transparent' }}
      transition={active ? { repeat: Infinity, duration: 1.6 } : {}}
      className={cn('relative rounded-lg', active ? 'border-4 border-primary p-0.5' : 'border border-border')}>
      {children}
    </motion.div>
  );
}

export function DrawTools({ color, width, onColor, onWidth }: { color: string; width: number; onColor: (c: string) => void; onWidth: (w: number) => void }) {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-wrap items-center gap-3 border-y border-border/60 py-3">
      <div className="grid flex-1 grid-cols-10 gap-1.5 sm:max-w-sm">
        {PEN_COLORS.map((c) => (
          <Button key={c} type="button" variant="ghost" onClick={() => onColor(c)}
            aria-label={`Pen color ${c}`} aria-pressed={color === c}
            className={cn('aspect-square h-auto w-full rounded-full border-2 p-0', color === c ? 'border-foreground ring-2 ring-primary' : 'border-border')}
            style={{ background: c }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {PEN_WIDTHS.map((w) => (
          <Button key={w.label} type="button" variant="ghost" onClick={() => onWidth(w.value)} aria-pressed={width === w.value}
            className={cn('flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors',
              width === w.value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
            <span className="rounded-full" style={{ width: w.value * 1400, height: w.value * 1400, background: color, minWidth: 4, minHeight: 4 }} />
            {w.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
