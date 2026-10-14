import { motion, useReducedMotion } from 'framer-motion';
import { Repeat2, Sparkles } from 'lucide-react';
import type { CanvasGame } from '@/types/canvas';
import { cn } from '@/lib/utils';

export default function GuessWordStatus({ game, now }: { game: CanvasGame; now: number }) {
  const reduced = useReducedMotion();
  if (game.phase !== 'drawing' && game.phase !== 'grace') return null;
  const sameWord = game.addition_index > 1;
  const started = game.addition_started_at ? Date.parse(game.addition_started_at) : 0;
  const fresh = !sameWord && now - started < 6000;
  const Icon = sameWord ? Repeat2 : Sparkles;
  return (
    <motion.section key={`${game.masterpiece_index}-${game.addition_index}`} role="status" aria-label="Current word"
      initial={reduced ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-start gap-3 border-l-4 py-2 pl-3', sameWord ? 'border-primary' : 'border-secondary')}>
      <Icon aria-hidden="true" className={cn('mt-1 h-5 w-5 shrink-0', sameWord ? 'text-primary' : 'text-secondary')} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground">Word {game.masterpiece_index} · Artist {game.addition_index} of 3</p>
        <h2 className={cn('font-display text-xl font-bold sm:text-2xl', sameWord ? 'text-primary' : 'text-secondary')}>
          {sameWord ? 'Same word — keep guessing' : fresh ? 'New word — fresh drawing!' : `Guess word ${game.masterpiece_index}`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{sameWord ? 'New artist, same drawing. The answer hasn’t changed.' : 'A new answer. Everyone starts again.'}</p>
      </div>
    </motion.section>
  );
}