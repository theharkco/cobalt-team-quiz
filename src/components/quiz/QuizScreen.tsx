import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PartyBackdrop, { BouncyWord } from './PartyBackdrop';

interface QuizScreenProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  eyebrow?: string;
  corner?: ReactNode;
}

export default function QuizScreen({ children, className, contentClassName, eyebrow, corner }: QuizScreenProps) {
  return (
    <main className={cn('quiz-screen', className)}>
      <div className="stage-grid" aria-hidden="true" />
      <PartyBackdrop />
      <header className="stage-chrome">
        <BouncyWord text="Quizclash" className="stage-brand" />
        {eyebrow && <span className="ml-4 rotate-[-2deg] rounded-full border-2 border-[hsl(var(--shadow-color))] bg-accent px-3 py-0.5 text-sm font-extrabold text-accent-foreground">{eyebrow}</span>}
        {corner && <div className="stage-corner">{corner}</div>}
      </header>
      <div className={cn('stage-content', contentClassName)}>{children}</div>
    </main>
  );
}
