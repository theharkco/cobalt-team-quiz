import { useRef, useState, useCallback } from 'react';
import { playCountdownBeep } from '@/lib/sounds';

export function usePreCountdown() {
  const [preCountdown, setPreCountdown] = useState(0);
  const preCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPreCountdown = useCallback((onDone: () => void) => {
    if (preCountdownRef.current) clearInterval(preCountdownRef.current);
    setPreCountdown(3);
    playCountdownBeep(3);
    let count = 3;
    preCountdownRef.current = setInterval(() => {
      count--;
      setPreCountdown(count);
      if (count > 0) playCountdownBeep(count);
      if (count <= 0) {
        if (preCountdownRef.current) clearInterval(preCountdownRef.current);
        preCountdownRef.current = null;
        onDone();
      }
    }, 1000);
  }, []);

  const clearPreCountdown = useCallback(() => {
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current);
      preCountdownRef.current = null;
    }
  }, []);

  return { preCountdown, setPreCountdown, startPreCountdown, clearPreCountdown, preCountdownRef };
}
