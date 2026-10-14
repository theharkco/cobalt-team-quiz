import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Pencil, Sparkles } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';
import { worldRoster } from './contestantWorld';
import { cn } from '@/lib/utils';

interface Props { game: CanvasGame; players: CanvasPlayer[]; guesses: CanvasGuess[]; now: number; meId?: string; compact?: boolean }

export default function ContestantStage({ game, players, guesses, now, meId }: Props) {
  const reduced = Boolean(useReducedMotion());
  const roster = worldRoster(game, players, guesses, now, meId);
  const done = roster.filter((p) => p.status === 'correct' || p.status === 'artist').length;
  return (
    <section className="pencil-team" aria-label="The team">
      <div className="pencil-team-heading">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold sm:text-lg"><Sparkles className="hidden h-4 w-4 text-primary sm:block" /> The team</h2>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{players.length} done</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Players done" aria-valuemin={0} aria-valuemax={players.length} aria-valuenow={done}>
        <motion.div className="h-full bg-secondary" animate={{ width: `${players.length ? done / players.length * 100 : 0}%` }} />
      </div>
      <div className="pencil-cloud" aria-label="Floating contestants">
        {roster.map((p, index) => (
          <motion.div layout key={p.id} data-status={p.status} data-player-id={p.id}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            className={cn('pencil-cloud-player', p.isMe && 'pencil-cloud-me')}>
            <div className="pencil-character-space">
              <motion.div className="pencil-character" animate={reduced ? {} : { y: [0, -7, 0], rotate: [index % 2 ? -3 : 3, index % 2 ? 3 : -3, index % 2 ? -3 : 3] }}
                transition={{ duration: 3.5 + index % 3 * 0.7, repeat: Infinity, ease: 'easeInOut', delay: index * 0.17 }}>
                <svg viewBox="0 0 100 106" aria-hidden="true" className="pencil-mascot">
                  <ellipse cx="50" cy="98" rx="24" ry="4" className="mascot-shadow" />
                  <path d="M21 67C8 59 7 43 16 45L28 53M79 67C92 59 93 43 84 45L72 53" className="mascot-limbs" />
                  <path d="M28 85Q19 102 36 95L44 85M59 85Q63 102 76 94L71 83" className="mascot-limbs" />
                  <path d="M16 63C13 46 22 19 35 17C42 5 54 8 61 17C82 13 92 42 85 65C94 81 76 93 62 87C50 96 36 92 31 87C15 90 7 75 16 63Z" className="mascot-body" />
                  <path d="M27 35Q30 25 37 27" className="mascot-shine" />
                  <ellipse cx="50" cy="75" rx="18" ry="10" className="mascot-belly" />
                  <g className="mascot-face">
                    {p.status === 'correct' ? <><path d="M32 48Q37 41 42 48M59 48Q64 41 69 48" className="mascot-expression" /><path d="M43 58Q50 69 58 58Z" /></> : <><ellipse cx="37" cy="47" rx="3" ry="5" /><ellipse cx="64" cy="47" rx="3" ry="5" /><path d={p.status === 'drawing' ? 'M45 60Q51 54 57 60' : 'M44 58Q51 65 58 58'} className="mascot-expression" /></>}
                  </g>
                  <ellipse cx="28" cy="56" rx="6" ry="3" className="mascot-cheek" /><ellipse cx="74" cy="56" rx="6" ry="3" className="mascot-cheek" />
                </svg>
              </motion.div>
              <AnimatePresence mode="wait">
                {(p.bubble || p.status === 'correct' || p.status === 'drawing') && (
                  <motion.div key={p.bubble?.id ?? p.status} role="status" className={cn('pencil-speech', p.status === 'correct' && 'pencil-speech-correct', p.status === 'drawing' && 'pencil-speech-drawing')}
                    initial={{ y: 8, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}>
                    {p.status === 'correct' ? <Check aria-label="Correct guess" className="h-4 w-4" /> : p.status === 'drawing' ? <Pencil aria-label="Drawing" className="h-4 w-4" /> : p.bubble?.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="pencil-name" title={p.name}>{p.name}{p.isMe && <span className="text-muted-foreground"> · you</span>}</p>
            <p className={cn('pencil-player-status', p.status === 'correct' ? 'text-secondary' : p.status === 'drawing' ? 'text-primary' : 'text-muted-foreground')}>
              {p.status === 'correct' ? 'Got it!' : p.status === 'drawing' ? 'Drawing' : p.status === 'artist' ? 'Done · drew' : 'Guessing'}
            </p>
            <span className="pencil-player-score">{players.find((player) => player.id === p.id)?.canvas_score ?? 0} pts</span>
          </motion.div>
        ))}
        {!players.length && <p className="text-xs text-muted-foreground">Waiting for the team…</p>}
      </div>
    </section>
  );
}
