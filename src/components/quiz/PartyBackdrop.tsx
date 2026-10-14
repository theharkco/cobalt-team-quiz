import { motion, useReducedMotion } from 'framer-motion';

const SHAPES = [
  { c: 'bg-primary', x: '6%', y: '14%', s: 46, r: 'rounded-full', d: 0 },
  { c: 'bg-accent', x: '88%', y: '10%', s: 38, r: 'rounded-lg', d: 1.2 },
  { c: 'bg-secondary', x: '78%', y: '72%', s: 54, r: 'rounded-full', d: 0.6 },
  { c: 'bg-quiz-blue', x: '12%', y: '78%', s: 34, r: 'rounded-md', d: 1.8 },
  { c: 'bg-primary', x: '52%', y: '90%', s: 26, r: 'rounded-sm', d: 0.9 },
  { c: 'bg-accent', x: '40%', y: '6%', s: 22, r: 'rounded-full', d: 2.4 },
];

/** Floating sticker confetti behind every screen. Decorative only. */
export default function PartyBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((sh, i) => (
        <motion.span
          key={i}
          className={`absolute border-[3px] border-[hsl(var(--shadow-color))] opacity-70 ${sh.c} ${sh.r}`}
          style={{ left: sh.x, top: sh.y, width: sh.s, height: sh.s }}
          initial={{ scale: 0, rotate: -90 }}
          animate={reduce ? { scale: 1 } : { scale: 1, rotate: [0, 25, -15, 0], y: [0, -24, 10, 0] }}
          transition={{ scale: { type: 'spring', bounce: 0.6, delay: 0.2 + i * 0.08 }, default: { duration: 7 + i, repeat: Infinity, ease: 'easeInOut', delay: sh.d } }}
        />
      ))}
    </div>
  );
}

/** Brand wordmark whose letters bounce in and wiggle. Hover reacts instantly. */
export function BouncyWord({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const [entered, setEntered] = useState(false);
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ y: -60, opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          whileHover={reduce ? undefined : { y: -10, rotate: i % 2 ? 10 : -10, scale: 1.2 }}
          onAnimationComplete={() => setEntered(true)}
          transition={entered ? { type: 'spring', bounce: 0.65 } : { type: 'spring', bounce: 0.65, delay: i * 0.05 }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  );
}
