import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import type { QuizQuestion } from '@/data/questions';

interface QuestionDisplayProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  isHost?: boolean;
  timeElapsedMs?: number;
  hideOptions?: boolean;
  revealAnswer?: boolean;
}

const optionColors = [
  'bg-quiz-pink hover:bg-quiz-pink/80',
  'bg-quiz-blue hover:bg-quiz-blue/80',
  'bg-quiz-orange hover:bg-quiz-orange/80',
  'bg-quiz-purple hover:bg-quiz-purple/80',
];

const optionIcons = ['▲', '◆', '●', '★'];

function MusicEmbed({ spotifyEmbedUrl, revealAnswer }: { spotifyEmbedUrl: string; revealAnswer?: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [manualPlay, setManualPlay] = useState(false);

  const handlePlay = useCallback(() => {
    // Reload iframe within user gesture context to satisfy autoplay policy
    if (iframeRef.current) {
      iframeRef.current.src = `${spotifyEmbedUrl}&autoplay=1`;
    }
    setManualPlay(true);
  }, [spotifyEmbedUrl]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex justify-center mb-8"
    >
      <div className="relative w-72 md:w-96 rounded-2xl overflow-hidden border-4 border-border">
        {/* Overlay to hide song title/artist */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: revealAnswer ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card rounded-xl"
          style={{ pointerEvents: revealAnswer ? 'none' : 'auto' }}
        >
          <span className="text-5xl animate-pulse mb-2">🎵</span>
          <span className="font-display font-bold text-foreground text-lg">Listen carefully...</span>
          {!manualPlay ? (
            <button
              onClick={handlePlay}
              className="mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm hover:opacity-90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              ▶ Tap to Play
            </button>
          ) : (
            <span className="text-muted-foreground text-sm mt-1">Name the song or artist!</span>
          )}
        </motion.div>
        {/* Iframe behind overlay */}
        <iframe
          ref={iframeRef}
          src={`${spotifyEmbedUrl}&autoplay=1`}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 'none', borderRadius: '12px' }}
        />
      </div>
    </motion.div>
  );
}

export default function QuestionDisplay({ question, questionNumber, totalQuestions, isHost, timeElapsedMs = 0, hideOptions, revealAnswer }: QuestionDisplayProps) {
  const [blurAmount, setBlurAmount] = useState(40);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset loaded state when question changes
  useEffect(() => {
    setImageLoaded(false);
  }, [question.id]);

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);

  // Calculate blur based on time elapsed for image questions
  useEffect(() => {
    if (question.type === 'blurred-image' && question.blurLevels) {
      const levels = question.blurLevels;
      const totalDuration = 15000;
      const progress = Math.min(timeElapsedMs / totalDuration, 1);
      const index = Math.min(Math.floor(progress * (levels.length - 1)), levels.length - 2);
      const nextIndex = index + 1;
      const segmentProgress = (progress * (levels.length - 1)) - index;
      const blur = levels[index] + (levels[nextIndex] - levels[index]) * segmentProgress;
      setBlurAmount(Math.max(0, blur));
    }
  }, [timeElapsedMs, question]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Question header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <span className="text-sm font-body font-bold text-primary uppercase tracking-wider">
          Question {questionNumber} of {totalQuestions}
        </span>
        {question.category && (
          <span className="ml-3 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold">
            {question.category}
          </span>
        )}
      </motion.div>

      {/* Question text */}
      <motion.h2
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="text-2xl md:text-4xl font-display font-bold text-center text-foreground mb-8 leading-tight"
      >
        {question.question}
      </motion.h2>

      {/* Blurred image */}
      {question.type === 'blurred-image' && question.imageUrl && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden border-4 border-border">
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <img
              src={question.imageUrl}
              alt="Mystery"
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ filter: `blur(${blurAmount}px)`, transition: 'filter 0.3s ease' }}
              onLoad={handleImageLoad}
            />
          </div>
        </motion.div>
      )}

      {/* Spotify embed */}
      {question.type === 'music' && question.spotifyEmbedUrl && (
        <MusicEmbed
          spotifyEmbedUrl={question.spotifyEmbedUrl}
          revealAnswer={revealAnswer}
        />
      )}

      {/* Multiple choice options (host view - display only) */}
      {isHost && !hideOptions && question.options && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {question.options.map((option, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1, type: 'spring', bounce: 0.4 }}
              className={`${optionColors[i]} rounded-xl p-4 md:p-6 text-center cursor-default`}
            >
              <span className="text-2xl mr-2">{optionIcons[i]}</span>
              <span className="text-lg md:text-xl font-display font-bold text-foreground">{option}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
