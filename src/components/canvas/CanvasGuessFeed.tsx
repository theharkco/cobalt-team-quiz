import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, MessageCircle } from 'lucide-react';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';

export default function CanvasGuessFeed({ game, players, guesses }: { game: CanvasGame; players: CanvasPlayer[]; guesses: CanvasGuess[] }) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const reduced = useReducedMotion();
  const ordered = [...guesses].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [guesses]);
  return (
    <section className="pencil-chat" aria-label="Guess history">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold"><MessageCircle className="h-4 w-4 shrink-0 text-primary" /> Guesses</h2>
      <div ref={scroll} role="log" aria-label="Player guesses" aria-live="polite" aria-relevant="additions text" className="pencil-chat-log"
        onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32; }}>
        {!ordered.length && <p className="text-xs text-muted-foreground">No guesses yet.</p>}
        {ordered.map((g, i) => {
          const correct = g.is_correct || g.verdict === 'correct';
          const confirmed = !!g.verdict || g.masterpiece_index < game.masterpiece_index || game.phase === 'reveal' || game.status === 'finished';
          return <div key={g.id}>
            {(i === 0 || ordered[i - 1].masterpiece_index !== g.masterpiece_index) && <p className="mb-2 mt-3 text-xs font-semibold text-muted-foreground">Word {g.masterpiece_index}</p>}
            <motion.div initial={{ opacity: 0, x: reduced ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} className="pencil-chat-entry">
              <p className="break-words text-xs font-bold">{players.find((p) => p.id === g.player_id)?.name ?? 'Former player'}</p>
              {correct ? <p className="flex flex-wrap items-center gap-1 text-xs font-semibold text-secondary"><Check className="h-3 w-3 shrink-0" /> Got it! <span>+{g.points_earned}</span></p>
                : <div className="flex flex-wrap items-baseline gap-2">
                    <p className={confirmed ? 'break-words text-xs text-foreground' : 'text-xs text-muted-foreground'}>{confirmed ? g.guess : 'Checking…'}</p>
                    {confirmed && g.verdict === 'very-close' && <span className="pencil-near-label">So close!</span>}
                    {confirmed && g.verdict === 'close' && <span className="pencil-near-label">Getting warm!</span>}
                  </div>}
            </motion.div>
          </div>;
        })}
      </div>
    </section>
  );
}