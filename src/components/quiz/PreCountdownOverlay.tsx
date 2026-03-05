import { motion } from 'framer-motion';
import type { QuizQuestion } from '@/data/questionTypes';

interface PreCountdownOverlayProps {
  countdown: number;
  question: QuizQuestion;
}

export default function PreCountdownOverlay({ countdown, question }: PreCountdownOverlayProps) {
  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      {question.category && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
          className="flex flex-col items-center gap-2"
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-7xl block"
          >
            {question.question.match(/^\p{Emoji_Presentation}/u)?.[0] || '❓'}
          </motion.span>
          <motion.span
            initial={{ letterSpacing: '0.5em', opacity: 0 }}
            animate={{ letterSpacing: '0.15em', opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl md:text-3xl font-display font-bold text-accent-foreground uppercase"
          >
            {question.category}
          </motion.span>
        </motion.div>
      )}
      <motion.div
        key={countdown}
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="text-7xl md:text-9xl font-display font-bold text-primary"
      >
        {countdown}
      </motion.div>
    </div>
  );
}
