import { useState, useRef, useCallback } from 'react';

export function useTimer() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((referenceTime?: number) => {
    stop();
    const startTime = referenceTime ?? Date.now();
    startTimeRef.current = startTime;
    setTimeElapsed(Date.now() - startTime);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeElapsed(Date.now() - startTimeRef.current);
    }, 100);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setTimeElapsed(0);
  }, [stop]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { timeElapsed, isRunning, start, stop, reset, cleanup, startTimeRef };
}
