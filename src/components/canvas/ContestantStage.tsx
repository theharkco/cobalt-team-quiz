import { lazy, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Check, Pencil, Sparkles } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';
import { worldRoster } from './contestantWorld';

const CharacterStage = lazy(() => import('./CharacterStage'));
interface Props { game: CanvasGame; players: CanvasPlayer[]; guesses: CanvasGuess[]; now: number; meId?: string; compact?: boolean }

export default function ContestantStage({ game, players, guesses, now, meId }: Props) {
  const reduced = !!useReducedMotion();
  const roster = worldRoster(game, players, guesses, now, meId);
  const done = roster.filter((p) => p.status === 'correct' || p.status === 'artist').length;
  return (
    <section className="relative border-t border-border pt-4" aria-label="The team">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="stage-kicker flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> The team</p>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{players.length} done</span>
      </div>
      <div className="contestant-world relative aspect-square w-full overflow-hidden rounded-lg" aria-label="Contestant world">
        <Suspense fallback={<p className="p-4 text-center text-xs text-muted-foreground">Getting the team ready…</p>}>
          <CharacterStage players={roster} reduced={reduced} />
        </Suspense>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5 text-primary" /> Drawing deck</span>
        <span className="flex items-center gap-1.5 text-secondary"><Check className="h-3.5 w-3.5" /> Green zone · {roster.filter((p) => p.status === 'correct').length} solved</span>
      </div>
    </section>
  );
}
