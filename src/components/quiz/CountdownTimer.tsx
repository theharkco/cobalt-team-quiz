import { useEffect, useRef } from 'react';

interface CountdownTimerProps {
  duration: number; // seconds
  timeElapsed: number; // ms elapsed since question started
  onComplete: () => void;
  isRunning: boolean;
  size?: number;
}

export default function CountdownTimer({ duration, timeElapsed, onComplete, isRunning, size = 120 }: CountdownTimerProps) {
  const completedRef = useRef(false);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;

  const timeLeft = Math.max(0, duration - timeElapsed / 1000);
  const progress = timeLeft / duration;
  const dashOffset = circumference * (1 - progress);

  // Reset completed flag when timer restarts
  useEffect(() => {
    if (isRunning && timeElapsed < 500) {
      completedRef.current = false;
    }
  }, [isRunning, timeElapsed]);

  // Detect completion
  useEffect(() => {
    if (timeLeft <= 0 && isRunning && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [timeLeft <= 0, isRunning, onComplete]);

  const color = timeLeft > 10 ? 'hsl(var(--quiz-green))' : timeLeft > 5 ? 'hsl(var(--quiz-orange))' : 'hsl(var(--destructive))';
  const displayTime = Math.ceil(timeLeft);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={timeLeft <= 5 && isRunning ? 'animate-pulse-ring' : ''}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-100"
        />
      </svg>
      <span
        className="absolute font-display font-bold"
        style={{ fontSize: size * 0.35, color }}
      >
        {displayTime}
      </span>
    </div>
  );
}
