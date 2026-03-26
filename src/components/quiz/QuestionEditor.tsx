import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { QuestionType, Difficulty } from '@/data/questionTypes';

export interface QuestionFormData {
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  correctAnswers: string[];
  acceptableAnswers: string[];
  imageUrl: string;
  blurLevels: number[];
  spotifyEmbedUrl: string;
  category: string;
  difficulty: Difficulty;
  explanation: string;
}

const DEFAULT_BLUR_LEVELS = [50, 38, 28, 18, 10, 4, 0];

function createEmptyQuestion(): QuestionFormData {
  return {
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    correctAnswers: [],
    acceptableAnswers: [],
    imageUrl: '',
    blurLevels: DEFAULT_BLUR_LEVELS,
    spotifyEmbedUrl: '',
    category: '',
    difficulty: 'medium',
    explanation: '',
  };
}

interface Props {
  initialData?: QuestionFormData;
  questionNumber: number;
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function QuestionEditor({ initialData, questionNumber, onSave, onCancel, onDelete }: Props) {
  const [form, setForm] = useState<QuestionFormData>(initialData || createEmptyQuestion());

  const update = <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    update('options', newOptions);
  };

  const handleSave = () => {
    if (!form.question.trim()) return;
    if (form.type === 'select-wrong') {
      if (form.correctAnswers.length === 0) return;
    } else {
      if (!form.correctAnswer.trim()) return;
    }
    onSave(form);
  };

  const needsOptions = form.type === 'multiple-choice' || form.type === 'music' || form.type === 'select-wrong';
  const needsImage = form.type === 'blurred-image';
  const needsSpotify = form.type === 'music';
  const needsAcceptable = form.type === 'free-text' || form.type === 'blurred-image';
  const needsCorrectAnswers = form.type === 'select-wrong';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card border-2 border-border rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold text-foreground">
          Question {questionNumber}
        </h3>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            🗑️ Delete
          </Button>
        )}
      </div>

      {/* Type & Difficulty */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1 block">Type</label>
          <Select value={form.type} onValueChange={(v) => update('type', v as QuestionType)}>
            <SelectTrigger className="bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
              <SelectItem value="free-text">Free Text</SelectItem>
              <SelectItem value="blurred-image">Blurred Image</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="select-wrong">Select Wrong Answers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1 block">Difficulty</label>
          <Select value={form.difficulty} onValueChange={(v) => update('difficulty', v as Difficulty)}>
            <SelectTrigger className="bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-body text-muted-foreground mb-1 block">Category</label>
        <Input
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          placeholder="e.g. Science, History, Pop Culture..."
          className="bg-muted border-border text-foreground"
        />
      </div>

      {/* Question text */}
      <div>
        <label className="text-sm font-body text-muted-foreground mb-1 block">Question *</label>
        <Textarea
          value={form.question}
          onChange={(e) => update('question', e.target.value)}
          placeholder="Enter your question..."
          className="bg-muted border-border text-foreground min-h-[80px]"
        />
      </div>

      {/* Correct answer (not for select-wrong) */}
      {!needsCorrectAnswers && (
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1 block">Correct Answer *</label>
          <Input
            value={form.correctAnswer}
            onChange={(e) => update('correctAnswer', e.target.value)}
            placeholder="The correct answer"
            className="bg-muted border-border text-foreground"
          />
        </div>
      )}

      {/* Options for MC / Music / Select-wrong */}
      <AnimatePresence>
        {needsOptions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
            <label className="text-sm font-body text-muted-foreground block">
              {needsCorrectAnswers ? 'All Options (mix of correct and wrong)' : 'Answer Options (include the correct answer)'}
            </label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="bg-muted border-border text-foreground flex-1"
                />
                {needsCorrectAnswers && opt.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const isCorrect = form.correctAnswers.includes(opt);
                      if (isCorrect) {
                        update('correctAnswers', form.correctAnswers.filter(a => a !== opt));
                      } else {
                        update('correctAnswers', [...form.correctAnswers, opt]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                      form.correctAnswers.includes(opt)
                        ? 'bg-quiz-green/20 text-quiz-green border border-quiz-green'
                        : 'bg-muted text-muted-foreground border border-border hover:border-quiz-green'
                    }`}
                  >
                    {form.correctAnswers.includes(opt) ? '✓ Correct' : 'Mark correct'}
                  </button>
                )}
                {form.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOpts = form.options.filter((_, idx) => idx !== i);
                      update('options', newOpts);
                      // Also remove from correctAnswers if applicable
                      if (needsCorrectAnswers) {
                        update('correctAnswers', form.correctAnswers.filter(a => a !== opt));
                      }
                    }}
                    className="text-destructive hover:text-destructive/80 text-sm px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update('options', [...form.options, ''])}
              className="text-muted-foreground"
            >
              + Add Option
            </Button>
            {needsCorrectAnswers && (
              <p className="text-xs text-muted-foreground">
                Mark the <span className="text-quiz-green font-bold">correct</span> answers above. Players will need to select all the unmarked (wrong) ones.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acceptable answers for free-text / blurred-image */}
      <AnimatePresence>
        {needsAcceptable && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <label className="text-sm font-body text-muted-foreground mb-1 block">
              Acceptable Answers (comma-separated alternatives)
            </label>
            <Input
              value={form.acceptableAnswers.join(', ')}
              onChange={(e) => update('acceptableAnswers', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. answer1, answer2, answer3"
              className="bg-muted border-border text-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image URL for blurred-image */}
      <AnimatePresence>
        {needsImage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <label className="text-sm font-body text-muted-foreground mb-1 block">Image URL</label>
            <Input
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="https://... or /images/..."
              className="bg-muted border-border text-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spotify URL for music */}
      <AnimatePresence>
        {needsSpotify && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <label className="text-sm font-body text-muted-foreground mb-1 block">Spotify Embed URL</label>
            <Input
              value={form.spotifyEmbedUrl}
              onChange={(e) => update('spotifyEmbedUrl', e.target.value)}
              placeholder="https://open.spotify.com/embed/track/..."
              className="bg-muted border-border text-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <div>
        <label className="text-sm font-body text-muted-foreground mb-1 block">Explanation (shown after answer reveal)</label>
        <Textarea
          value={form.explanation}
          onChange={(e) => update('explanation', e.target.value)}
          placeholder="Optional explanation..."
          className="bg-muted border-border text-foreground min-h-[60px]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!form.question.trim() || (needsCorrectAnswers ? form.correctAnswers.length === 0 : !form.correctAnswer.trim())}
          className="flex-1 h-12 font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
        >
          ✅ Save Question
        </Button>
        <Button onClick={onCancel} variant="outline" className="h-12 font-display rounded-xl border-border">
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

export { createEmptyQuestion };
