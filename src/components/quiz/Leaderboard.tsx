import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Player } from '@/hooks/useQuizSession';
import Emoji from '@/components/quiz/Emoji';
import { Crown, Medal } from 'lucide-react';

interface LeaderboardProps {
  players: Player[];
  previousScores?: Record<string, number>;
  isFinal?: boolean;
}

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ players, previousScores, isFinal }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (sorted.length > 0) {
      confetti({
        particleCount: isFinal ? 200 : 60,
        spread: isFinal ? 120 : 70,
        origin: { y: 0.3 },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#FF8C42'],
      });
    }
  }, []);

  if (isFinal) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
        <div className="text-center"><p className="stage-kicker">The final signal</p><h2 className="mt-3 text-4xl md:text-6xl font-display font-bold animate-bounce-in">Champions crowned.</h2></div>

        {/* Podium */}
        <div className="flex h-72 items-end justify-center gap-2 border-b border-border mt-4 mb-8 md:gap-4">
          {sorted.slice(0, 3).map((player, i) => {
            const order = [1, 0, 2]; // 2nd, 1st, 3rd placement
            const idx = order[i];
            if (!sorted[idx]) return null;
            const p = sorted[idx];
            const heights = ['h-40', 'h-28', 'h-20'];
            return (
              <motion.div
                key={p.id}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.3, type: 'spring', bounce: 0.5 }}
                className="flex flex-col items-center"
              >
                <span className="mb-3 text-primary">{idx === 0 ? <Crown className="h-9 w-9"/> : <Medal className="h-8 w-8"/>}</span>
                <div
                  className="w-16 h-16 rounded-md flex items-center justify-center text-xl font-bold mb-2 border border-border"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-display font-bold text-foreground text-sm mb-1 truncate max-w-[80px]">{p.name}</span>
                <div className={`${heights[idx]} w-24 rounded-t-md border border-b-0 border-primary/40 bg-primary/10 flex items-center justify-center`}>
                  <span className="font-display font-bold text-secondary text-lg tabular-nums">{p.score}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Rest of players */}
        <div className="w-full space-y-2">
          {sorted.slice(3).map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.2 + i * 0.1 }}
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border border-border bg-card rounded-md p-3"
            >
              <span className="font-display font-bold text-muted-foreground w-8 text-center">{i + 4}</span>
              <div
                className="w-9 h-9 rounded flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-body font-bold text-foreground flex-1">{player.name}</span>
              <span className="font-display font-bold text-secondary tabular-nums">{player.score}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2">
      <div className="mb-7 text-center"><p className="stage-kicker">Scores after this round</p><h2 className="mt-2 text-3xl md:text-5xl font-display font-bold animate-bounce-in">The standings.</h2></div>
      <AnimatePresence>
        {sorted.map((player, i) => {
          const prev = previousScores?.[player.id] ?? 0;
          const gained = player.score - prev;
          return (
            <motion.div
              key={player.id}
              layout
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              className="grid grid-cols-[3rem_2.5rem_1fr_auto_auto] items-center gap-3 bg-card rounded-md p-3 border border-border"
            >
              <span className="font-display font-bold text-lg text-center text-muted-foreground tabular-nums">{String(i + 1).padStart(2,'0')}</span>
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-body font-bold text-foreground flex-1 truncate">{player.name}</span>
              {gained > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-sm font-bold text-quiz-green"
                >
                  +{gained}
                </motion.span>
              )}
              <motion.span
                className="font-display font-bold text-secondary text-lg min-w-[60px] text-right tabular-nums"
                key={player.score}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
              >
                {player.score}
              </motion.span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
