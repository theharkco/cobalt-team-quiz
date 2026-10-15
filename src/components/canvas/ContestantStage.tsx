import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Pencil, Sparkles, X } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';
import { worldRoster } from './contestantWorld';
import { cn } from '@/lib/utils';

interface Props { game: CanvasGame; players: CanvasPlayer[]; guesses: CanvasGuess[]; now: number; meId?: string; compact?: boolean }

export default function ContestantStage({ game, players, guesses, now, meId }: Props) {
  const reduced = Boolean(useReducedMotion());
  // Identity is independent of score/order, so climbing the standings never changes a character.
  const identities = [...players].sort((a, b) => a.id.localeCompare(b.id));
  const ranked = [...players].sort((a, b) => b.canvas_score - a.canvas_score || a.id.localeCompare(b.id));
  const roster = worldRoster(game, ranked, guesses, now, meId);
  const done = roster.filter((p) => p.status === 'correct' || p.status === 'artist').length;
  return (
    <section className="pencil-team" aria-label="The players">
      <div className="pencil-team-heading">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold sm:text-lg"><Sparkles className="hidden h-4 w-4 text-primary sm:block" /> Players</h2>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{players.length} done</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Players done" aria-valuemin={0} aria-valuemax={players.length} aria-valuenow={done}>
        <motion.div className="h-full bg-secondary" animate={{ width: `${players.length ? done / players.length * 100 : 0}%` }} />
      </div>
      <div className="pencil-cloud" aria-label="Floating contestants">
        {roster.map((p, index) => {
          const identity = identities.findIndex((player) => player.id === p.id);
          const face = identity % 6;
          return (
          <motion.div layout key={p.id} data-status={p.status} data-player-id={p.id} data-face={face} data-color={identity % 20}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            className={cn('pencil-cloud-player', `mascot-color-${identity % 20}`, p.isMe && 'pencil-cloud-me')}>
            <span className="pencil-player-rank" aria-label={`Rank ${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
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
                    {p.status === 'correct' ? <><path d="M32 48Q37 41 42 48M59 48Q64 41 69 48" className="mascot-expression" /><path d="M43 58Q50 69 58 58Z" /></> : <>
                      {face === 1 ? <><path d="M32 47Q37 42 42 47" className="mascot-expression" /><ellipse cx="64" cy="47" rx="3" ry="5" /></> : face === 2 ? <><path d="M32 46L42 49M59 49L69 46" className="mascot-expression" /></> : face === 4 ? <><circle cx="37" cy="47" r="4" /><circle cx="64" cy="47" r="4" /><path d="M31 37L42 39M60 39L70 37" className="mascot-expression" /></> : <><ellipse cx="37" cy="47" rx="3" ry={face === 5 ? 3 : 5} /><ellipse cx="64" cy="47" rx="3" ry={face === 5 ? 3 : 5} /></>}
                      {face === 3 ? <ellipse cx="51" cy="61" rx="4" ry="5" /> : <path d={face === 1 ? 'M44 59Q51 66 59 55' : face === 5 ? 'M43 58Q51 73 60 58Z' : face === 4 ? 'M46 60L56 60' : 'M44 58Q51 65 58 58'} className="mascot-expression" />}
                    </>}
                  </g>
                  <ellipse cx="28" cy="56" rx="6" ry="3" className="mascot-cheek" /><ellipse cx="74" cy="56" rx="6" ry="3" className="mascot-cheek" />
                </svg>
              </motion.div>
              <AnimatePresence>
                {(p.bubble || p.status === 'correct' || p.status === 'drawing') && (
                  <motion.div key={p.bubble?.id ?? p.status} role="status" className={cn('pencil-speech', p.bubble && 'pencil-speech-wrong', p.status === 'correct' && 'pencil-speech-correct', p.status === 'drawing' && 'pencil-speech-drawing')}
                    initial={reduced ? { opacity: 0 } : { y: 14, opacity: 0, scale: 0.35, rotate: -12 }}
                    animate={reduced ? { opacity: 1 } : { y: [14, -6, 0], opacity: 1, scale: [0.35, 1.15, 1], rotate: [-12, 6, -4, 2, 0] }}
                    exit={{ y: -8, opacity: 0, scale: 0.9 }} transition={{ duration: reduced ? 0 : 0.55, ease: 'easeOut' }}>
                    {p.status === 'correct' ? <Check aria-label="Correct guess" className="h-4 w-4" /> : p.status === 'drawing' ? <Pencil aria-label="Drawing" className="h-4 w-4" /> : <><X className="h-3 w-3 shrink-0" aria-hidden="true" /><span>{p.bubble?.text}</span></>}
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
        ); })}
        {!players.length && <p className="text-xs text-muted-foreground">Waiting for players…</p>}
      </div>
    </section>
  );
}
