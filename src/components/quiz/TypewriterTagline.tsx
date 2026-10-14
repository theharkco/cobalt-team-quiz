import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pickTagline } from '@/lib/taglines';

// Typewriter pacing. The sentence types out, sits for a beat so it can be read,
// then wipes away and the next one starts typing.
const TYPE_MS = 22;
const HOLD_MS = 3600;
const ERASE_MS = 9;
// When motion is dialled down, sentences simply swap instead of typing.
const REDUCE_MS = 7000;

function nextLine(current: string) {
  let next = pickTagline();
  let guard = 0;
  // pickTagline already avoids repeats, but storage can be blocked (private
  // mode, sandboxed frame), so make sure the reader never sees the same line.
  while (next === current && guard++ < 25) next = pickTagline();
  return next;
}

/**
 * The one-liner under the front-page title: types a sentence out character by
 * character, holds it, wipes it, and starts a new random sentence.
 *
 * `erasing` decides which direction the text moves, so the typing branch must
 * not run while wiping — otherwise a deleted character is instantly retyped and
 * the sentence never changes.
 */
export default function TypewriterTagline() {
  const [line, setLine] = useState(() => pickTagline());
  const [shown, setShown] = useState('');
  const [erasing, setErasing] = useState(false);
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (reduced) {
      setShown(line);
      const t = setTimeout(() => setLine(nextLine(line)), REDUCE_MS);
      return () => clearTimeout(t);
    }

    if (erasing) {
      if (shown.length > 0) {
        const t = setTimeout(() => setShown((s) => s.slice(0, -1)), ERASE_MS);
        return () => clearTimeout(t);
      }
      setErasing(false);
      setLine(nextLine(line));
      return;
    }

    if (shown.length < line.length) {
      const t = setTimeout(() => setShown(line.slice(0, shown.length + 1)), TYPE_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setErasing(true), HOLD_MS);
    return () => clearTimeout(t);
  }, [shown, line, erasing, reduced]);

  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      aria-label={line}
      className="tagline max-w-md text-xl font-semibold text-muted-foreground"
    >
      {shown}
      <span className="tagline-caret" aria-hidden="true" />
    </motion.p>
  );
}
