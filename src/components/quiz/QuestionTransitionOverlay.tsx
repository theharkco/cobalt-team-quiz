import { motion } from 'framer-motion';

interface Props {
  questionNumber: number;
}

export default function QuestionTransitionOverlay({ questionNumber }: Props) {
  return (
    <motion.div
      key="question-transition"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden"
    >
      <div className="stage-grid" aria-hidden="true" />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 text-center"
      >
        <p className="stage-kicker">Stand by</p>
        <p className="font-display text-[clamp(5rem,18vw,12rem)] font-bold leading-none text-primary tabular-nums">
          {String(questionNumber).padStart(2, '0')}
        </p>
        <div className="mx-auto mt-5 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full bg-secondary" initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ duration: 0.35 }} />
        </div>
      </motion.div>
    </motion.div>
  );
}