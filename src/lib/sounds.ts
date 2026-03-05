const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = audioCtx();
  return ctx;
};

export function playCorrect() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);

  // Happy ascending notes
  osc.frequency.setValueAtTime(523, c.currentTime);       // C5
  osc.frequency.setValueAtTime(659, c.currentTime + 0.1);  // E5
  osc.frequency.setValueAtTime(784, c.currentTime + 0.2);  // G5
  osc.frequency.setValueAtTime(1047, c.currentTime + 0.3); // C6
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.5);
}

export function playWrong() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);

  // Descending buzz
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.4);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.4);
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function startTicking(getTimeLeft: () => number) {
  stopTicking();
  const tick = () => {
    const t = getTimeLeft();
    if (t <= 0) { stopTicking(); return; }
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    // Pitch and volume increase as time runs out
    const urgency = t <= 5 ? 0.25 : 0.1;
    const freq = t <= 5 ? 1200 : 800;
    gain.gain.setValueAtTime(urgency, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.05);
    osc.frequency.setValueAtTime(freq, c.currentTime);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.05);
  };
  tick();
  tickInterval = setInterval(tick, 1000);
}

export function stopTicking() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}
