import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
  previewUrl: string;
  /** When true the clip plays; when false it pauses. */
  playing: boolean;
  /** Whether this device should output sound (host screen and player phones both do). */
  audible?: boolean;
  /**
   * Epoch ms of the shared question start (the server's `question_started_at`).
   * Every device seeks to `now - startEpochMs`, so phones that receive the
   * question a moment late — or hydrate mid-question — land on the same spot in
   * the clip as everyone else instead of starting from zero.
   */
  startEpochMs?: number;
  /** Show track title/artist (only after the answer is revealed). */
  trackName?: string;
  artistName?: string;
  revealTrack?: boolean;
}

const BAR_COUNT = 7;
/** Seek only when we're off by more than this — small jitter isn't audible. */
const DRIFT_TOLERANCE_S = 0.35;
/** How often to re-check drift while the clip plays. */
const DRIFT_CHECK_MS = 3000;

export default function MusicPlayer({
  previewUrl,
  playing,
  audible = true,
  startEpochMs,
  trackName,
  artistName,
  revealTrack,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  /** Where in the clip this device should currently be, in seconds. */
  const targetPosition = useCallback(() => {
    if (!startEpochMs) return 0;
    return Math.max(0, (Date.now() - startEpochMs) / 1000);
  }, [startEpochMs]);

  /** Align playback with the shared timeline, waiting for metadata if needed. */
  const syncPosition = useCallback(
    (el: HTMLAudioElement) => {
      const apply = () => {
        const target = targetPosition();
        const duration = Number.isFinite(el.duration) ? el.duration : undefined;
        if (duration !== undefined && target >= duration) return;
        if (Math.abs(el.currentTime - target) > DRIFT_TOLERANCE_S) {
          try {
            el.currentTime = target;
          } catch {
            /* seeking before the browser is ready — the next check retries */
          }
        }
      };
      if (el.readyState === 0) {
        el.addEventListener('loadedmetadata', apply, { once: true });
      } else {
        apply();
      }
    },
    [targetPosition]
  );

  // Reset when the source changes
  useEffect(() => {
    setBlocked(false);
    const el = audioRef.current;
    if (el) el.currentTime = 0;
  }, [previewUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing && audible && !muted) {
      el.volume = 0.85;
      // Seek to the shared position BEFORE playing so a late device doesn't
      // audibly restart the clip from the beginning.
      syncPosition(el);
      el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      el.pause();
    }
  }, [playing, audible, muted, previewUrl, syncPosition]);

  // Keep long-lived playback aligned (tab throttling, buffering stalls).
  useEffect(() => {
    if (!playing || !audible || muted || !startEpochMs) return;
    const id = window.setInterval(() => {
      const el = audioRef.current;
      if (el && !el.paused) syncPosition(el);
    }, DRIFT_CHECK_MS);
    return () => window.clearInterval(id);
  }, [playing, audible, muted, startEpochMs, syncPosition]);

  const start = () => {
    const el = audioRef.current;
    if (!el) return;
    setMuted(false);
    syncPosition(el);
    el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col items-center gap-4 mb-8"
    >
      {audible && <audio ref={audioRef} src={previewUrl} preload="auto" />}

      <div className="flex items-end justify-center gap-2 h-24">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <motion.span
            key={i}
            className="w-4 rounded-full bg-quiz-purple"
            animate={playing ? { height: [16, 72, 30, 88, 20] } : { height: 16 }}
            transition={
              playing
                ? { duration: 1.1 + i * 0.13, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
                : { duration: 0.3 }
            }
            style={{ height: 16 }}
          />
        ))}
      </div>

      {audible && blocked && (
        <button
          onClick={start}
          className="px-6 py-3 rounded-full bg-primary font-display font-bold text-primary-foreground shadow-lg animate-pulse"
        >
          ▶ Tap to hear the clip
        </button>
      )}

      {audible && !blocked && playing && (
        <button
          onClick={() => (muted ? start() : setMuted(true))}
          className="px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground font-body text-sm"
        >
          {muted ? '🔇 Sound off — tap to listen' : '🔊 Mute on this device'}
        </button>
      )}

      {revealTrack && (trackName || artistName) && (
        <p className="font-body text-muted-foreground text-center">
          <span className="font-bold text-foreground">{trackName}</span>
          {artistName ? ` — ${artistName}` : ''}
        </p>
      )}
    </motion.div>
  );
}
