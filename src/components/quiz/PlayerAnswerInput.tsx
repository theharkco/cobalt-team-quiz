import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { QuizQuestion } from '@/data/questions';

interface PlayerAnswerInputProps {
  question: QuizQuestion;
  onSubmit: (answer: string) => void;
  onSubmitMultiple?: (answers: string[]) => void;
  disabled: boolean;
}

const optionColors = [
  'bg-quiz-pink hover:bg-quiz-pink/80 active:scale-95',
  'bg-quiz-blue hover:bg-quiz-blue/80 active:scale-95',
  'bg-quiz-orange hover:bg-quiz-orange/80 active:scale-95',
  'bg-quiz-purple hover:bg-quiz-purple/80 active:scale-95',
  'bg-quiz-green hover:bg-quiz-green/80 active:scale-95',
  'bg-primary hover:bg-primary/80 active:scale-95',
];

const optionIcons = ['▲', '◆', '●', '★', '■', '⬟'];

export default function PlayerAnswerInput({ question, onSubmit, onSubmitMultiple, disabled }: PlayerAnswerInputProps) {
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedWrong, setSelectedWrong] = useState<Set<string>>(new Set());

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

  // Select-wrong: multi-select mode
  if (question.type === 'select-wrong') {
    const toggleOption = (option: string) => {
      setSelectedWrong(prev => {
        const next = new Set(prev);
        if (next.has(option)) next.delete(option);
        else next.add(option);
        return next;
      });
    };

    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <p className="text-center text-sm font-body text-muted-foreground">
          🚫 Tap all the <span className="font-bold text-destructive">WRONG</span> answers, then submit!
        </p>
        <div className="grid grid-cols-2 gap-3">
          {question.options?.map((option, i) => {
            const isSelected = selectedWrong.has(option);
            return (
              <motion.button
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', bounce: 0.5 }}
                onClick={() => toggleOption(option)}
                className={`${optionColors[i % optionColors.length]} rounded-xl p-4 md:p-6 text-center transition-all font-display font-bold text-foreground text-base md:text-lg border-none cursor-pointer relative ${
                  isSelected ? 'ring-4 ring-destructive scale-95 opacity-80' : ''
                }`}
              >
                <span className="text-xl mr-2">{optionIcons[i % optionIcons.length]}</span>
                {option}
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  >
                    ✗
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
        <Button
          onClick={() => onSubmitMultiple?.(Array.from(selectedWrong))}
          disabled={selectedWrong.size === 0}
          className="w-full h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
        >
          Submit {selectedWrong.size} answer{selectedWrong.size !== 1 ? 's' : ''} 🚀
        </Button>
      </div>
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
            className={`${optionColors[i % optionColors.length]} rounded-xl p-4 md:p-6 text-center transition-transform font-display font-bold text-foreground text-base md:text-lg border-none cursor-pointer`}
          >
            <span className="text-xl mr-2">{optionIcons[i % optionIcons.length]}</span>
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
