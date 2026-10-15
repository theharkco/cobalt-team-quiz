// Procedural background music for Pass the Pencil — light, playful loop
// synthesized with Web Audio. No external assets, low volume, muteable.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let scheduler: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0;
let running = false;
let muted = false;

const BPM = 112;
const STEP = 60 / BPM / 2; // eighth notes
const LOOKAHEAD_MS = 120;
const SCHEDULE_AHEAD_S = 0.3;

// A breezy C-major loop: melody (16 steps) + bass (8 steps), repeats.
// null = rest. Frequencies in Hz.
const MELODY: (number | null)[] = [
  523.25, null, 659.25, 783.99, null, 659.25, null, 587.33,
  523.25, null, 440.0, 523.25, null, 587.33, 659.25, null,
];
const BASS: (number | null)[] = [
  130.81, null, 196.0, null, 174.61, null, 196.0, null,
  130.81, null, 196.0, null, 220.0, null, 196.0, null,
];

const getCtx = (): AudioContext | null => {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

const blip = (freq: number, time: number, dur: number, vol: number, type: OscillatorType) => {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
};

const scheduleStep = (s: number, time: number) => {
  const m = MELODY[s % MELODY.length];
  const b = BASS[s % BASS.length];
  if (m) blip(m, time, STEP * 0.9, 0.5, 'triangle');
  if (b) blip(b, time, STEP * 1.6, 0.35, 'sine');
};

const tick = () => {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP;
    step += 1;
  }
};

export function startBgMusic() {
  if (running) return;
  const c = getCtx();
  if (!c) return;
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.05; // deliberately quiet — flair, not takeover
    master.connect(c.destination);
  }
  master.gain.setValueAtTime(muted ? 0 : 0.05, c.currentTime);
  running = true;
  step = 0;
  nextNoteTime = c.currentTime + 0.1;
  scheduler = setInterval(tick, LOOKAHEAD_MS);
}

export function stopBgMusic() {
  running = false;
  if (scheduler) { clearInterval(scheduler); scheduler = null; }
}

export function setBgMusicMuted(m: boolean) {
  muted = m;
  if (ctx && master) master.gain.setValueAtTime(m ? 0 : 0.05, ctx.currentTime);
}

export function isBgMusicMuted() {
  return muted;
}
