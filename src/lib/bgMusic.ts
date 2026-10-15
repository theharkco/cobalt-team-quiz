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

// A breezy C-major loop with variation: four 16-step melody phrases that
// rotate over a C – F – G – Am bass line, plus a soft hi-hat tick.
// null = rest. Frequencies in Hz.
const MELODIES: (number | null)[][] = [
  // Phrase A — the original hook
  [523.25, null, 659.25, 783.99, null, 659.25, null, 587.33,
   523.25, null, 440.0, 523.25, null, 587.33, 659.25, null],
  // Phrase B — answers A, a touch lower
  [659.25, null, 587.33, 523.25, null, 440.0, null, 523.25,
   587.33, null, 523.25, 440.0, null, 392.0, 440.0, null],
  // Phrase C — climbs higher, more playful
  [783.99, null, 880.0, 783.99, null, 659.25, null, 783.99,
   880.0, null, 783.99, 659.25, null, 587.33, 659.25, null],
  // Phrase D — settles back down to rest
  [659.25, null, 523.25, 587.33, null, 659.25, null, 523.25,
   440.0, null, 523.25, null, 392.0, null, null, null],
];
const BASS: (number | null)[] = [
  130.81, null, 196.0, null, 174.61, null, 196.0, null,
  130.81, null, 196.0, null, 220.0, null, 196.0, null,
];
// Chord roots per 16-step bar: C, F, G, Am — the bass walks between them.
const CHORD_ROOTS = [130.81, 174.61, 196.0, 220.0];

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

// Tiny noise tick for the hi-hat feel.
const hat = (time: number, vol: number) => {
  if (!ctx || !master) return;
  const len = 0.03;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(time);
};

const scheduleStep = (s: number, time: number) => {
  const bar = Math.floor(s / 16);
  const phrase = MELODIES[Math.floor(bar / 2) % MELODIES.length];
  const m = phrase[s % 16];
  const b = BASS[s % BASS.length];
  // Bass alternates between the loop note and the current chord root each bar.
  const bassNote = bar % 2 === 0 ? b : (s % 8 === 0 || s % 8 === 4 ? CHORD_ROOTS[bar % 4] : b);
  if (m) blip(m, time, STEP * 0.9, 0.5, 'triangle');
  if (bassNote) blip(bassNote, time, STEP * 1.6, 0.35, 'sine');
  // Hi-hat on off-beats, softer on every other one.
  if (s % 2 === 1) hat(time, s % 4 === 3 ? 0.05 : 0.03);
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

// Resume after a page switch without needing a new gesture — only works if
// the audio context was already unlocked by an earlier tap/click.
export function resumeBgMusic() {
  if (running || !ctx) return;
  startBgMusic();
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
