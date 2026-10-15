import { useEffect, useState } from 'react';

/** Best-effort background clock; no browser can keep a frozen/discarded tab alive. */
export function useCanvasHostClock() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    let worker: Worker | undefined;
    let fallback: ReturnType<typeof setInterval> | undefined;
    const startFallback = () => {
      if (fallback === undefined) fallback = setInterval(tick, 250);
    };
    try {
      worker = new Worker(new URL('../workers/canvasClock.ts', import.meta.url), { type: 'module' });
      // Read the current wall clock, not a potentially queued worker timestamp.
      worker.onmessage = tick;
      worker.onerror = () => { worker?.terminate(); startFallback(); };
    } catch {
      startFallback();
    }
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('pageshow', tick);
    window.addEventListener('focus', tick);
    return () => {
      worker?.terminate();
      if (fallback !== undefined) clearInterval(fallback);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('pageshow', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return now;
}