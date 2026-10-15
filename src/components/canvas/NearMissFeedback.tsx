import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';

export default function NearMissFeedback({ level }: { level: 'close' | 'very-close' }) {
  const reduced = useReducedMotion();
  const hot = level === 'very-close';
  const Icon = hot ? Flame : Sparkles;
  return <motion.div role="status" className="pencil-near-feedback" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
    <motion.span animate={reduced ? {} : { rotate: [-12, 12, -8, 0], scale: [0.7, 1.25, 1] }} transition={{ duration: 0.6 }}><Icon className="h-6 w-6 shrink-0" /></motion.span>
    <div className="min-w-0"><p className="font-display text-lg font-bold">{hot ? 'So close!' : 'Getting warm!'}</p><p className="text-xs text-muted-foreground">{hot ? 'Almost there — keep guessing.' : 'On the right track — keep guessing.'}</p></div>
    <div aria-hidden="true" className="ml-auto flex shrink-0 items-end gap-1">
      {Array.from({ length: 5 }, (_, i) => <motion.span key={i} className={i < (hot ? 4 : 3) ? 'pencil-heat-bar pencil-heat-lit' : 'pencil-heat-bar'} initial={{ scaleY: reduced ? 1 : 0 }} animate={{ scaleY: 1 }} transition={{ delay: reduced ? 0 : i * 0.08, type: 'spring', bounce: 0.5 }} />)}
    </div>
  </motion.div>;
}