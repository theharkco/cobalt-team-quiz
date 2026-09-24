import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
      <header className="stage-chrome">
        <span className="stage-brand">QUIZCLASH</span>
        {eyebrow && <span className="stage-eyebrow">{eyebrow}</span>}
        {corner && <div className="stage-corner">{corner}</div>}
      </header>
      <div className={cn('stage-content', contentClassName)}>{children}</div>
    </main>
  );
}