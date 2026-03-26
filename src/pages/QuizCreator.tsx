import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import QuestionEditor, { type QuestionFormData, createEmptyQuestion } from '@/components/quiz/QuestionEditor';
import SortableQuestionCard from '@/components/quiz/SortableQuestionCard';
import { toast } from '@/hooks/use-toast';
import type { QuestionType, Difficulty } from '@/data/questionTypes';

interface SavedQuestion {
  id?: string;
  data: QuestionFormData;
}

export default function QuizCreator() {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const isEditing = !!quizId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  // Load existing quiz if editing
  useEffect(() => {
    if (!quizId) return;
    (async () => {
      const [{ data: quiz }, { data: qQuestions }] = await Promise.all([
        supabase.from('custom_quizzes').select('*').eq('id', quizId).single(),
        supabase.from('custom_quiz_questions').select('*').eq('quiz_id', quizId).order('sort_order'),
      ]);

      if (quiz) {
        setTitle(quiz.title);
        setDescription(quiz.description || '');
      }
      if (qQuestions) {
        setQuestions(
          qQuestions.map((q: Record<string, unknown>) => ({
            id: q.id as string,
            data: {
              type: q.type as QuestionType,
              question: q.question as string,
              options: (q.options as string[]) || ['', '', '', ''],
              correctAnswer: q.correct_answer as string,
              correctAnswers: (q.acceptable_answers as string[]) || [], // reuse acceptable_answers column for correctAnswers in select-wrong
              acceptableAnswers: (q.acceptable_answers as string[]) || [],
              imageUrl: (q.image_url as string) || '',
              blurLevels: (q.blur_levels as number[]) || [50, 38, 28, 18, 10, 4, 0],
              spotifyEmbedUrl: (q.spotify_embed_url as string) || '',
              category: (q.category as string) || '',
              difficulty: (q.difficulty as Difficulty) || 'medium',
              explanation: (q.explanation as string) || '',
              timeLimitSeconds: (q.time_limit_seconds as number) || 15,
            },
          }))
        );
      }
      setLoading(false);
    })();
  }, [quizId]);

  const handleSaveQuestion = (data: QuestionFormData, index?: number) => {
    if (index !== undefined && index !== null) {
      setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, data } : q)));
      setEditingIndex(null);
    } else {
      setQuestions((prev) => [...prev, { data }]);
      setIsAddingNew(false);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((_, i) => `q-${i}` === active.id);
      const newIndex = prev.findIndex((_, i) => `q-${i}` === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      // Update editing index
      if (editingIndex === oldIndex) setEditingIndex(newIndex);
      else if (editingIndex !== null && oldIndex < editingIndex && newIndex >= editingIndex) setEditingIndex(editingIndex - 1);
      else if (editingIndex !== null && oldIndex > editingIndex && newIndex <= editingIndex) setEditingIndex(editingIndex + 1);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, [editingIndex]);

  const handleSaveQuiz = async () => {
    if (!title.trim() || questions.length === 0) {
      toast({ title: 'Missing info', description: 'Add a title and at least one question.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let finalQuizId = quizId;

      if (isEditing) {
        await supabase.from('custom_quizzes').update({ title, description }).eq('id', quizId);
        // Delete old questions and re-insert
        await supabase.from('custom_quiz_questions').delete().eq('quiz_id', quizId);
      } else {
        const { data, error } = await supabase
          .from('custom_quizzes')
          .insert({ title, description })
          .select()
          .single();
        if (error) throw error;
        finalQuizId = data.id;
      }

      // Insert all questions
      const questionRows = questions.map((q, i) => ({
        quiz_id: finalQuizId!,
        sort_order: i,
        type: q.data.type,
        question: q.data.question,
        options: q.data.options.filter(Boolean).length > 0 ? q.data.options.filter(Boolean) : null,
        correct_answer: q.data.type === 'select-wrong' ? (q.data.correctAnswers[0] || '') : q.data.correctAnswer,
        acceptable_answers: q.data.type === 'select-wrong'
          ? (q.data.correctAnswers.length > 0 ? q.data.correctAnswers : null)
          : (q.data.acceptableAnswers.length > 0 ? q.data.acceptableAnswers : null),
        image_url: q.data.imageUrl || null,
        blur_levels: q.data.blurLevels,
        spotify_embed_url: q.data.spotifyEmbedUrl || null,
        category: q.data.category || null,
        difficulty: q.data.difficulty,
        explanation: q.data.explanation || null,
        time_limit_seconds: q.data.timeLimitSeconds,
      }));

      const { error: insertErr } = await supabase.from('custom_quiz_questions').insert(questionRows);
      if (insertErr) throw insertErr;

      toast({ title: '✅ Quiz saved!', description: `"${title}" with ${questions.length} questions.` });
      navigate('/');
    } catch (err) {
      console.error('Failed to save quiz:', err);
      toast({ title: 'Error', description: 'Failed to save quiz. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-body text-lg">Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingShapes />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground font-body mb-4">
            ← Back
          </Button>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-2">
            {isEditing ? 'Edit Quiz' : 'Create Quiz'}
          </h1>
          <p className="text-muted-foreground font-body">
            Build your custom quiz with multiple question types
          </p>
        </motion.div>

        {/* Quiz Details */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border-2 border-border rounded-2xl p-6 mb-6 space-y-4"
        >
          <div>
            <label className="text-sm font-body text-muted-foreground mb-1 block">Quiz Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Quiz"
              className="bg-muted border-border text-foreground text-lg font-display"
            />
          </div>
          <div>
            <label className="text-sm font-body text-muted-foreground mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this quiz about?"
              className="bg-muted border-border text-foreground min-h-[60px]"
            />
          </div>
        </motion.div>

        {/* Questions List */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">
            Questions ({questions.length})
          </h2>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
              {questions.map((q, index) =>
                editingIndex === index ? (
                  <QuestionEditor
                    key={`edit-${index}`}
                    initialData={q.data}
                    questionNumber={index + 1}
                    onSave={(data) => handleSaveQuestion(data, index)}
                    onCancel={() => setEditingIndex(null)}
                    onDelete={() => handleDeleteQuestion(index)}
                  />
                ) : (
                  <SortableQuestionCard
                    key={`saved-${index}`}
                    id={`q-${index}`}
                    index={index}
                    data={q.data}
                    onClick={() => setEditingIndex(index)}
                  />
                )
              )}
            </SortableContext>
          </DndContext>

          {/* Add new question */}
          {isAddingNew ? (
            <QuestionEditor
              questionNumber={questions.length + 1}
              onSave={(data) => handleSaveQuestion(data)}
              onCancel={() => setIsAddingNew(false)}
            />
          ) : (
            <Button
              onClick={() => setIsAddingNew(true)}
              variant="outline"
              className="w-full h-14 text-lg font-display font-bold rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              ➕ Add Question
            </Button>
          )}
        </div>

        {/* Save Quiz */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Button
            onClick={handleSaveQuiz}
            disabled={saving || !title.trim() || questions.length === 0}
            className="w-full h-16 text-xl font-display font-bold rounded-2xl gradient-fun text-foreground border-none hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {saving ? '⏳ Saving...' : `💾 Save Quiz (${questions.length} questions)`}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
