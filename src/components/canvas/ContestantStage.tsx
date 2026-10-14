import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';
import { cn } from '@/lib/utils';

/** Wrong-guess bubbles wait this long so a correct guess is never shown before the host confirms it. */
const BUBBLE_DELAY_MS = 700;
const BUBBLE_MS = 3200;

type Status = 'drawing' | 'artist' | 'correct' | 'guessing';

interface Props {
  game: CanvasGame;
  players: CanvasPlayer[];
  guesses: CanvasGuess[];
  now: number;
  meId?: string;
  compact?: boolean;
}

const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function ContestantStage({ game, players, guesses, now, meId, compact }: Props) {
  const round = guesses.filter((g) => g.masterpiece_index === game.masterpiece_index);
  const active = game.phase === 'drawing' || game.phase === 'grace';
  const statusOf = (p: CanvasPlayer): Status => {
    if (active && p.id === game.current_artist_id) return 'drawing';
    if (round.some((g) => g.player_id === p.id && g.is_correct)) return 'correct';
    if ((game.round_artist_ids ?? []).includes(p.id)) return 'artist';
    return 'guessing';
  };
  const done = players.filter((p) => statusOf(p) !== 'guessing').length;

  return (
    <div className="stage-panel relative overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="stage-kicker">The team</p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full bg-secondary" animate={{ width: `${players.length ? (done / players.length) * 100 : 0}%` }} transition={{ type: 'spring', bounce: 0.4 }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{players.length} done</span>
        </div>
      </div>
      <motion.ul layout className={cn('flex flex-wrap justify-center', compact ? 'gap-x-3 gap-y-6 pt-6' : 'gap-x-5 gap-y-9 pt-9')}>
        {players.map((p) => {
          const st = statusOf(p);
          const last = [...round].reverse().find((g) => g.player_id === p.id);
          const age = last ? now - new Date(last.created_at).getTime() : Infinity;
          const bubble = st === 'guessing' && last && !last.is_correct && age > BUBBLE_DELAY_MS && age < BUBBLE_MS + BUBBLE_DELAY_MS;
          return (
            <motion.li layout key={p.id} className="relative flex w-16 flex-col items-center gap-1.5">
              <AnimatePresence>
                {bubble && (
                  <motion.span key={last!.id} initial={{ y: 10, scale: 0.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0.55 }}
                    className="absolute -top-8 z-10 max-w-[9rem] truncate whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold shadow-lg">
                    {last!.guess}
                  </motion.span>
                )}
              </AnimatePresence>
              <Avatar name={p.name} status={st} me={p.id === meId} compact={compact} />
              <span className={cn('max-w-full truncate text-xs font-semibold', p.id === meId && 'text-primary')}>{p.id === meId ? 'You' : p.name}</span>
              <StatusLabel status={st} />
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

function Avatar({ name, status, me, compact }: { name: string; status: Status; me?: boolean; compact?: boolean }) {
  const size = compact ? 'h-12 w-12 text-sm' : 'h-14 w-14 text-base';
  return (
    <motion.div className={cn('relative flex items-center justify-center', size)}
      animate={status === 'drawing' ? { scale: 1.15 } : status === 'correct' ? { scale: [1, 1.35, 1] } : { scale: 1 }}
      transition={status === 'correct' ? { duration: 0.5 } : { type: 'spring', bounce: 0.5 }}>
      {status === 'drawing' && (
        <motion.span className="absolute -inset-1.5 rounded-full border-[3px] border-dashed border-primary"
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} />
      )}
      {status === 'drawing' && (
        <motion.span className="absolute -inset-3 rounded-full bg-primary/25" animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.6, 0, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.6 }} />
      )}
      {status === 'correct' && <Burst />}
      <span className={cn('relative flex h-full w-full items-center justify-center rounded-full border-2 font-display font-bold transition-colors duration-300',
        status === 'drawing' && 'border-primary bg-primary text-primary-foreground',
        status === 'correct' && 'border-secondary bg-secondary text-secondary-foreground',
        status === 'artist' && 'border-border bg-muted text-muted-foreground',
        status === 'guessing' && 'border-border bg-card text-foreground',
        me && status === 'guessing' && 'border-primary')}>
        {status === 'correct' ? <Check className="h-6 w-6" strokeWidth={3} /> : initials(name)}
      </span>
      {status === 'drawing' && (
        <motion.span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-accent text-accent-foreground"
          animate={{ rotate: [0, -25, 15, -10, 0] }} transition={{ repeat: Infinity, duration: 1.2, repeatDelay: 0.3 }}>
          <Pencil className="h-3 w-3" />
        </motion.span>
      )}
      {status === 'guessing' && (
        <span className="absolute -bottom-0.5 -right-0.5 flex gap-0.5 rounded-full border border-border bg-card px-1 py-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1 w-1 rounded-full bg-muted-foreground" animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
          ))}
        </span>
      )}
    </motion.div>
  );
}

function StatusLabel({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    drawing: ['Drawing', 'text-primary'],
    correct: ['Got it!', 'text-secondary'],
    artist: ['Drew it', 'text-muted-foreground'],
    guessing: ['Guessing…', 'text-muted-foreground'],
  };
  const [label, cls] = map[status];
  return (
    <AnimatePresence mode="wait">
      <motion.span key={status} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }}
        className={cn('text-[10px] font-bold uppercase tracking-wider', cls)}>{label}</motion.span>
    </AnimatePresence>
  );
}

function Burst() {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute h-2 w-2 rounded-full bg-secondary"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 44, y: Math.sin(a) * 44, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.7, ease: 'easeOut' }} />
        );
      })}
      <motion.span className="absolute inset-0 rounded-full border-4 border-secondary" initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }} />
    </>
  );
}
