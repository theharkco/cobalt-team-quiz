import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PartyBackdrop, { BouncyWord } from './PartyBackdrop';

interface QuizScreenProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  eyebrow?: string;
  corner?: ReactNode;
  /** Show the back-to-home button (default true). */
  showBack?: boolean;
  /** Custom back action; defaults to the front page. */
  onBack?: () => void;
  showBackdrop?: boolean;
}

export default function QuizScreen({ children, className, contentClassName, eyebrow, corner, showBack = true, onBack, showBackdrop = true }: QuizScreenProps) {
  const navigate = useNavigate();
  return (
    <main className={cn('quiz-screen', className)}>
      <div className="stage-grid" aria-hidden="true" />
      {showBackdrop && <PartyBackdrop />}
      <header className="stage-chrome">
        {showBack && (
          <motion.button type="button" aria-label="Back to the front page" onClick={onBack ?? (() => navigate('/'))}
            whileHover={{ x: -4, rotate: -6, scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={{ type: 'spring', stiffness: 700, damping: 14 }}
            className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[hsl(var(--shadow-color))] bg-primary text-primary-foreground shadow-[var(--shadow-ink-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        )}
        <button type="button" onClick={() => navigate('/')} className="rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
          <BouncyWord text="Quizclash" className="stage-brand" />
        </button>
        {eyebrow && <span className="ml-4 rotate-[-2deg] rounded-full border-2 border-[hsl(var(--shadow-color))] bg-accent px-3 py-0.5 text-sm font-extrabold text-accent-foreground">{eyebrow}</span>}
        {corner && <div className="stage-corner">{corner}</div>}
      </header>
      <div className={cn('stage-content', contentClassName)}>{children}</div>
    </main>
  );
}
