import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Pencil, Sparkles } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';
import type { ContestantStatus } from './CharacterStage';
import { cn } from '@/lib/utils';

const CharacterStage = lazy(() => import('./CharacterStage'));
interface Props { game: CanvasGame; players: CanvasPlayer[]; guesses: CanvasGuess[]; now: number; meId?: string; compact?: boolean }

export default function ContestantStage({ game, players, guesses, now, meId }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  const reduced = !!useReducedMotion();
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setColumns(Math.max(1, Math.min(6, Math.floor(entry.contentRect.width / 105)))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const round = guesses.filter((g) => g.masterpiece_index === game.masterpiece_index);
  const active = game.phase === 'drawing' || game.phase === 'grace';
  const roster = players.map((p) => {
    const correct = round.some((g) => g.player_id === p.id && g.is_correct);
    const status: ContestantStatus = active && p.id === game.current_artist_id ? 'drawing' : correct ? 'correct' : game.round_artist_ids.includes(p.id) ? 'artist' : 'guessing';
    const last = [...round].reverse().find((g) => g.player_id === p.id && g.verdict === 'incorrect');
    const bubble = status === 'guessing' && last && now - new Date(last.created_at).getTime() < 3500 ? last : undefined;
    return { ...p, status, bubble, reaction: bubble?.id };
  });
  const done = roster.filter((p) => p.status === 'correct' || p.status === 'artist').length;
  const labels = { drawing: 'Drawing', correct: 'Got it!', artist: 'Done · drew it', guessing: 'Guessing' };
  return (
    <section ref={container} className="relative border-t border-border pt-4" aria-label="The team">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="stage-kicker flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> The team</p>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{players.length} done</span>
      </div>
      <div className="relative">
        <div className="absolute inset-0">
          <Suspense fallback={<p className="text-center text-xs text-muted-foreground">Getting the team ready…</p>}>
            <CharacterStage players={roster} columns={columns} reduced={reduced} />
          </Suspense>
        </div>
        <ul className="pointer-events-none relative grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {roster.map((p) => <li key={p.id} className="relative flex aspect-[31/48] min-w-0 flex-col justify-end px-1 pb-2 text-center">
            <AnimatePresence>
              {p.bubble && <motion.span key={p.bubble.id} initial={{ y: 8, scale: 0.5, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }}
                className="absolute left-0 right-0 top-1 z-10 mx-auto w-fit max-w-full break-words rounded-md border border-destructive/50 bg-card px-2 py-1 text-xs font-semibold">{p.bubble.guess}</motion.span>}
            </AnimatePresence>
            {p.status === 'drawing' && <motion.span animate={reduced ? {} : { y: [0, -5, 0], rotate: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute left-1/2 top-0 -translate-x-1/2 text-primary"><Pencil className="h-5 w-5" /></motion.span>}
            {p.status === 'correct' && <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className="absolute right-1 top-2 rounded-full bg-secondary p-1 text-secondary-foreground"><Check className="h-4 w-4" /></motion.span>}
            <span className={cn('truncate font-display text-sm font-bold', p.id === meId && 'text-primary')}>{p.id === meId ? 'You' : p.name}</span>
            <motion.span key={p.status} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn('text-[10px] font-bold', p.status === 'drawing' ? 'text-primary' : p.status === 'correct' ? 'text-secondary' : 'text-muted-foreground')}>{labels[p.status]}</motion.span>
          </li>)}
        </ul>
      </div>
    </section>
  );
}
