import { motion, useReducedMotion } from 'framer-motion';
import type { WordHint } from '@/data/canvas/wordHints';

export default function WordHintDisplay({ hint }: { hint: WordHint }) {
  const reduced = useReducedMotion();
  return <section className="pencil-word-hint" aria-label="Word hint">
    <p className="text-xs font-bold text-muted-foreground">Word hint</p>
    <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label={hint.mask}>
      {hint.mask.split(' ').map((word, wordIndex) => <div key={wordIndex} className="flex max-w-full flex-wrap gap-1">
        {Array.from(word).map((letter, index) => <motion.span key={`${wordIndex}-${index}-${letter}`} className={letter === '_' ? 'pencil-hint-letter' : 'pencil-hint-letter pencil-hint-revealed'}
          initial={{ opacity: 0, y: reduced ? 0 : -10, scale: reduced ? 1 : 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>{letter === '_' ? '·' : letter.toUpperCase()}</motion.span>)}
      </div>)}
    </div>
  </section>;
}