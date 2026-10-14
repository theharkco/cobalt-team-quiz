import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';

/** Instant, full-screen celebration on the guesser's own phone. */
export default function CorrectBurst({ show, points, onDone }: { show: boolean; points: number; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const accent = getComputedStyle(document.documentElement);
    const c = (v: string) => `hsl(${accent.getPropertyValue(v).trim()})`;
    confetti({ particleCount: 140, spread: 100, startVelocity: 55, origin: { y: 0.6 }, colors: [c('--secondary'), c('--primary'), c('--accent')] });
    navigator.vibrate?.([40, 30, 80]);
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <motion.div className="absolute inset-0 bg-secondary" initial={{ clipPath: 'circle(0% at 50% 85%)' }}
            animate={{ clipPath: ['circle(0% at 50% 85%)', 'circle(150% at 50% 85%)'], opacity: [1, 1, 0.92] }} transition={{ duration: 0.35, ease: 'easeOut' }} />
          <motion.div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-background text-secondary"
            initial={{ scale: 0, rotate: -120 }} animate={{ scale: [0, 1.3, 1], rotate: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
            <Check className="h-20 w-20" strokeWidth={4} />
            <motion.span className="absolute inset-0 rounded-full border-8 border-background" initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.8, delay: 0.15 }} />
          </motion.div>
          <motion.p className="relative mt-6 font-display text-6xl font-black text-secondary-foreground"
            initial={{ y: 40, scale: 0.5, opacity: 0 }} animate={{ y: 0, scale: [0.5, 1.15, 1], opacity: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
            YOU GOT IT!
          </motion.p>
          {points > 0 && (
            <motion.p className="relative mt-2 font-display text-4xl font-bold text-secondary-foreground"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', bounce: 0.6 }}>
              +{points}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
