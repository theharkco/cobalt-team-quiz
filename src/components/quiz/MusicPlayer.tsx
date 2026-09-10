import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  previewUrl: string;
  /** When true the clip plays; when false it pauses. */
  playing: boolean;
  /** Whether this device should output sound (host screen and player phones both do). */
  audible?: boolean;
  /** Show track title/artist (only after the answer is revealed). */
  trackName?: string;
  artistName?: string;
  revealTrack?: boolean;
}

const BAR_COUNT = 7;

export default function MusicPlayer({ previewUrl, playing, audible = true, trackName, artistName, revealTrack }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  // Restart the clip whenever the source changes
  useEffect(() => {
    setBlocked(false);
    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;
    }
  }, [previewUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing && audible && !muted) {
      el.volume = 0.85;
      el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      el.pause();
    }
  }, [playing, audible, muted, previewUrl]);

  const start = () => {
    const el = audioRef.current;
    if (!el) return;
    setMuted(false);
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

      {blocked && (
        <button
          onClick={start}
          className="px-5 py-2 rounded-full bg-primary font-display font-bold text-primary-foreground"
        >
          ▶ Play the clip
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
