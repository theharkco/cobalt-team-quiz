import { motion } from 'framer-motion';
import type { QuizQuestion } from '@/data/questionTypes';
import Emoji from '@/components/quiz/Emoji';

interface PreCountdownOverlayProps {
  countdown: number;
  question: QuizQuestion;
}

export default function PreCountdownOverlay({ countdown, question }: PreCountdownOverlayProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-7 md:gap-10">
      {question.category && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid h-20 w-20 place-items-center rounded-lg border border-border bg-card text-4xl md:h-24 md:w-24 md:text-5xl"
          >
            <Emoji label="category">{question.question.match(/^\p{Emoji_Presentation}/u)?.[0] || '❓'}</Emoji>
          </motion.span>
          <motion.span
            initial={{ letterSpacing: '0.5em', opacity: 0 }}
            animate={{ letterSpacing: '0.15em', opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="stage-kicker text-primary"
          >
            {question.category}
          </motion.span>
        </motion.div>
      )}
      <motion.div
        key={countdown}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.25 }}
        className="font-display text-[clamp(8rem,28vw,16rem)] font-bold leading-none text-foreground tabular-nums"
      >
        {countdown}
      </motion.div>
    </div>
  );
}
