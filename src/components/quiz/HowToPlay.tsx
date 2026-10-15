import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HowToPlayStep {
  icon: LucideIcon;
  title: string;
  body: string;
  tone?: 'primary' | 'secondary' | 'accent';
  /** Stretch this card across the full width (used for the final side-challenge note). */
  wide?: boolean;
}

const toneClass: Record<NonNullable<HowToPlayStep['tone']>, string> = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  accent: 'bg-accent text-accent-foreground',
};

interface Props {
  steps: HowToPlayStep[];
  className?: string;
}

/** Animated "how the game works" strip shown on the joined/lobby screens. */
export default function HowToPlay({ steps, className }: Props) {
  return (
    <ol className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <motion.li
            key={step.title}
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.14, type: 'spring', bounce: 0.4 }}
            className={cn(
              'stage-panel relative overflow-hidden rounded-lg p-4 text-left',
              (step.wide ?? i === steps.length - 1) && steps.length % 2 === 1 && 'sm:col-span-2',
            )}
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10"
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.5 }}
            />
            <div className="flex items-start gap-3">
              <motion.div
                className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-md', toneClass[step.tone ?? 'primary'])}
                animate={{ rotate: [0, -6, 6, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.5, delay: i * 0.7 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{step.body}</p>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
