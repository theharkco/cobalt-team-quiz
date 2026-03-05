let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
};

export function playCorrect() {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);

    osc.frequency.setValueAtTime(523, c.currentTime);
    osc.frequency.setValueAtTime(659, c.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, c.currentTime + 0.2);
    osc.frequency.setValueAtTime(1047, c.currentTime + 0.3);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.5);
  } catch { /* silently fail */ }
}

export function playWrong() {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);

    osc.frequency.setValueAtTime(300, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.4);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.4);
  } catch { /* silently fail */ }
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function startTicking(getTimeLeft: () => number) {
  stopTicking();
  const tick = () => {
    try {
      const t = getTimeLeft();
      if (t <= 0) { stopTicking(); return; }
      const c = getCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      const urgency = t <= 5 ? 0.25 : 0.1;
      const freq = t <= 5 ? 1200 : 800;
      gain.gain.setValueAtTime(urgency, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.05);
      osc.frequency.setValueAtTime(freq, c.currentTime);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.05);
    } catch { /* silently fail */ }
  };
  tick();
  tickInterval = setInterval(tick, 1000);
}

export function stopTicking() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

export function playCountdownBeep(count: number) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    // Higher pitch and louder on final beep (count === 1)
    const freq = count === 1 ? 880 : 587;
    const vol = count === 1 ? 0.4 : 0.25;
    const duration = count === 1 ? 0.3 : 0.15;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration);
    osc.frequency.setValueAtTime(freq, c.currentTime);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch { /* silently fail */ }
}
