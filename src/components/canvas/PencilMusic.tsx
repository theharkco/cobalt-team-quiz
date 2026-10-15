import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, VolumeX } from 'lucide-react';
import { isBgMusicMuted, setBgMusicMuted, startBgMusic, stopBgMusic } from '@/lib/bgMusic';

/**
 * Background music for Pass the Pencil. Browsers require a user gesture before
 * audio can play, so the loop starts on the first tap/click anywhere (joining
 * the game or pressing a button counts). A small floating button toggles mute.
 */
export default function PencilMusic() {
  const [muted, setMuted] = useState(isBgMusicMuted());
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const unlock = () => {
      startBgMusic();
      setStarted(true);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      stopBgMusic();
    };
  }, []);

  const toggle = () => {
    const next = !muted;
    setBgMusicMuted(next);
    setMuted(next);
    if (!next) startBgMusic();
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.5, delay: 0.4 }}
      whileTap={{ scale: 0.85 }}
      aria-label={muted ? 'Turn background music on' : 'Mute background music'}
      title={muted ? 'Turn background music on' : 'Mute background music'}
      className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground"
    >
      {muted || !started ? <VolumeX className="h-5 w-5" /> : <Music className="h-5 w-5 text-primary" />}
    </motion.button>
  );
}
