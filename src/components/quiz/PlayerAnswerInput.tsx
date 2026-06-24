import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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

  // Put-in-order: drag-and-drop ranking
  if (question.type === 'put-in-order') {
    return <PutInOrderInput question={question} onSubmit={onSubmit} />;
  }

  // Highbrow/Lowbrow: two-stage answer with optional reveal
  if (question.type === 'highbrow-lowbrow') {
    return <HighbrowLowbrowInput question={question} onSubmit={onSubmit} />;
  }



  // Closest Without Going Over: numeric input
  if (question.type === 'closest-without-going-over') {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md mx-auto space-y-4"
      >
        <p className="text-center text-sm font-body text-muted-foreground">
          🎯 Get as close as you can <span className="font-bold text-primary">without going over!</span>
        </p>
        <Input
          type="number"
          inputMode="decimal"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder="Enter your guess..."
          className="text-center text-2xl font-display font-bold h-16 bg-card border-2 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
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
          Lock In Guess 🎯
        </Button>
      </motion.div>
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

// ---------- Put-in-Order drag list ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Avoid the (very rare) case where shuffle returns same order
  if (arr.length > 1 && a.every((v, i) => v === arr[i])) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
}

function PutInOrderInput({ question, onSubmit }: { question: QuizQuestion; onSubmit: (answer: string) => void }) {
  const initial = useMemo(() => shuffle(question.options || []), [question.id]);
  const [order, setOrder] = useState<string[]>(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-md mx-auto space-y-4"
    >
      <p className="text-center text-sm font-body text-muted-foreground">
        🔀 Drag to reorder — <span className="font-bold text-primary">top = first</span>
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((item, i) => (
              <SortableOrderItem key={item} id={item} label={item} position={i + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        onClick={() => onSubmit(JSON.stringify(order))}
        className="w-full h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
      >
        Lock In Order 🔒
      </Button>
    </motion.div>
  );
}

function SortableOrderItem({ id, label, position }: { id: string; label: string; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 bg-card border-2 border-border rounded-xl p-3 md:p-4 touch-none cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50 border-primary' : 'hover:border-primary/40'
      }`}
    >
      <div className="w-9 h-9 rounded-full gradient-fun flex items-center justify-center font-display font-bold text-foreground text-sm shrink-0">
        {position}
      </div>
      <span className="flex-1 font-display font-bold text-foreground text-base md:text-lg">{label}</span>
      <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
    </div>
  );
}

// ---------- Highbrow / Lowbrow ----------

function HighbrowLowbrowInput({ question, onSubmit }: { question: QuizQuestion; onSubmit: (answer: string) => void }) {
  const [side, setSide] = useState<'highbrow' | 'lowbrow'>('highbrow');
  const [textAnswer, setTextAnswer] = useState('');

  const inputType = side === 'highbrow'
    ? (question.highbrowInputType ?? 'multiple-choice')
    : (question.lowbrowInputType ?? 'multiple-choice');
  const opts = side === 'highbrow'
    ? (question.options ?? [])
    : (question.lowbrowOptions ?? []);
  const prompt = side === 'highbrow'
    ? question.question
    : (question.lowbrowQuestion ?? '');
  const points = side === 'highbrow' ? 200 : 100;

  const submit = (answer: string) => {
    onSubmit(JSON.stringify({ side, answer }));
  };

  return (
    <motion.div
      key={side}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto space-y-4"
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className={`px-4 py-1.5 rounded-full font-display font-bold text-sm tracking-wide ${
            side === 'highbrow'
              ? 'bg-quiz-purple text-foreground'
              : 'bg-quiz-orange text-foreground'
          }`}
        >
          {side === 'highbrow' ? '🎩 HIGHBROW' : '🎈 LOWBROW'} · {points} PTS
        </span>
      </div>

      {side === 'lowbrow' && (
        <div className="text-center text-xs font-body text-muted-foreground">
          Highbrow locked — answering this for {points} points
        </div>
      )}

      <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-5">
        <p className="text-lg md:text-xl font-display font-bold text-foreground text-center">
          {prompt}
        </p>
      </div>

      {inputType === 'multiple-choice' ? (
        <div className="grid grid-cols-2 gap-3">
          {opts.map((option, i) => (
            <motion.button
              key={`${side}-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', bounce: 0.5 }}
              onClick={() => submit(option)}
              className={`${optionColors[i % optionColors.length]} rounded-xl p-4 md:p-5 text-center transition-transform font-display font-bold text-foreground text-base md:text-lg border-none cursor-pointer`}
            >
              <span className="text-xl mr-2">{optionIcons[i % optionIcons.length]}</span>
              {option}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="text-center text-lg font-body h-14 bg-card border-2 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textAnswer.trim()) submit(textAnswer.trim());
            }}
          />
          <Button
            onClick={() => textAnswer.trim() && submit(textAnswer.trim())}
            disabled={!textAnswer.trim()}
            className="w-full h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
          >
            Submit Answer 🚀
          </Button>
        </div>
      )}

      {side === 'highbrow' && question.lowbrowQuestion && (
        <Button
          onClick={() => { setTextAnswer(''); setSide('lowbrow'); }}
          variant="outline"
          className="w-full h-12 font-display font-bold rounded-xl border-2 border-quiz-orange/60 text-quiz-orange hover:bg-quiz-orange/10 hover:text-quiz-orange"
        >
          🎈 Reveal Lowbrow Question (for 100 points)
        </Button>
      )}
    </motion.div>
  );
}


