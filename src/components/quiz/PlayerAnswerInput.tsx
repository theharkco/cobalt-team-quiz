import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { QuizQuestion } from '@/data/questions';

interface PlayerAnswerInputProps {
  question: QuizQuestion;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

const optionColors = [
  'bg-quiz-pink hover:bg-quiz-pink/80 active:scale-95',
  'bg-quiz-blue hover:bg-quiz-blue/80 active:scale-95',
  'bg-quiz-orange hover:bg-quiz-orange/80 active:scale-95',
  'bg-quiz-purple hover:bg-quiz-purple/80 active:scale-95',
];

const optionIcons = ['▲', '◆', '●', '★'];

export default function PlayerAnswerInput({ question, onSubmit, disabled }: PlayerAnswerInputProps) {
  const [textAnswer, setTextAnswer] = useState('');

  if (disabled) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-center py-12"
      >
        <span className="text-6xl mb-4 block animate-bounce-in">✅</span>
        <p className="text-xl font-display font-bold text-foreground">Answer submitted!</p>
        <p className="text-muted-foreground mt-2">Waiting for others...</p>
      </motion.div>
    );
  }

  // Multiple choice
  if (question.type === 'multiple-choice' || question.type === 'music') {
    return (
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg mx-auto">
        {question.options?.map((option, i) => (
          <motion.button
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', bounce: 0.5 }}
            onClick={() => onSubmit(option)}
            className={`${optionColors[i]} rounded-xl p-4 md:p-6 text-center transition-transform font-display font-bold text-foreground text-base md:text-lg border-none cursor-pointer`}
          >
            <span className="text-xl mr-2">{optionIcons[i]}</span>
            {option}
          </motion.button>
        ))}
      </div>
    );
  }

  // Free text / blurred image
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-md mx-auto space-y-4"
    >
      <Input
        value={textAnswer}
        onChange={(e) => setTextAnswer(e.target.value)}
        placeholder="Type your answer..."
        className="text-center text-lg font-body h-14 bg-card border-2 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && textAnswer.trim()) onSubmit(textAnswer.trim());
        }}
      />
      <Button
        onClick={() => textAnswer.trim() && onSubmit(textAnswer.trim())}
        disabled={!textAnswer.trim()}
        className="w-full h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
      >
        Submit Answer 🚀
      </Button>
    </motion.div>
  );
}
