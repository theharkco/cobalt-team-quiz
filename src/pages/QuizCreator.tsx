import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QuestionEditor, { type QuestionFormData, createEmptyQuestion } from '@/components/quiz/QuestionEditor';
import SortableQuestionCard from '@/components/quiz/SortableQuestionCard';
import { toast } from '@/hooks/use-toast';
import type { QuestionType, Difficulty } from '@/data/questionTypes';
import QuizScreen from '@/components/quiz/QuizScreen';
import { ArrowLeft, Plus, Save } from 'lucide-react';

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
              correctAnswers: (q.acceptable_answers as string[]) || [],
              acceptableAnswers: (q.acceptable_answers as string[]) || [],
              imageUrl: (q.image_url as string) || '',
              blurLevels: (q.blur_levels as number[]) || [50, 38, 28, 18, 10, 4, 0],
              spotifyEmbedUrl: (q.spotify_embed_url as string) || '',
              audioPreviewUrl: (q.audio_preview_url as string) || '',
              trackName: (q.track_name as string) || '',
              artistName: (q.artist_name as string) || '',
              category: (q.category as string) || '',
              difficulty: (q.difficulty as Difficulty) || 'medium',
              explanation: (q.explanation as string) || '',
              timeLimitSeconds: (q.time_limit_seconds as number) || 15,
              numericAnswer: (q.type as string) === 'closest-without-going-over'
                ? parseFloat(q.correct_answer as string)
                : '',
              lowbrowQuestion: (q.lowbrow_question as string) || '',
              highbrowInputType: ((q.highbrow_input_type as string) || 'multiple-choice') as 'multiple-choice' | 'free-text',
              lowbrowInputType: ((q.lowbrow_input_type as string) || 'multiple-choice') as 'multiple-choice' | 'free-text',
              lowbrowOptions: (q.lowbrow_options as string[]) || ['', '', '', ''],
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
        correct_answer: q.data.type === 'closest-without-going-over'
          ? String(q.data.numericAnswer)
          : q.data.type === 'select-wrong' ? (q.data.correctAnswers[0] || '')
          : q.data.type === 'put-in-order' ? JSON.stringify(q.data.options.filter(Boolean))
          : q.data.correctAnswer,
        acceptable_answers: q.data.type === 'select-wrong'
          ? (q.data.correctAnswers.length > 0 ? q.data.correctAnswers : null)
          : (q.data.acceptableAnswers.length > 0 ? q.data.acceptableAnswers : null),
        image_url: q.data.imageUrl || null,
        blur_levels: q.data.blurLevels,
        spotify_embed_url: q.data.spotifyEmbedUrl || null,
        audio_preview_url: q.data.audioPreviewUrl || null,
        track_name: q.data.trackName || null,
        artist_name: q.data.artistName || null,
        category: q.data.category || null,
        difficulty: q.data.difficulty,
        explanation: q.data.explanation || null,
        time_limit_seconds: q.data.timeLimitSeconds,
        lowbrow_question: q.data.type === 'highbrow-lowbrow' ? (q.data.lowbrowQuestion || null) : null,
        highbrow_input_type: q.data.type === 'highbrow-lowbrow' ? q.data.highbrowInputType : null,
        lowbrow_input_type: q.data.type === 'highbrow-lowbrow' ? q.data.lowbrowInputType : null,
        lowbrow_options: q.data.type === 'highbrow-lowbrow'
          ? (q.data.lowbrowOptions.filter(Boolean).length > 0 ? q.data.lowbrowOptions.filter(Boolean) : null)
          : null,
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body text-lg">Loading quiz...</p>
      </div>
    );
  }

  return (
    <QuizScreen eyebrow="Quiz studio" corner={<span className="text-xs font-bold text-muted-foreground">{questions.length} questions</span>} contentClassName="max-w-6xl px-4 py-8 md:px-8">
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Header */}
        <aside className="lg:sticky lg:top-20 lg:self-start"><motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-5 -ml-3">
            <ArrowLeft /> Back
          </Button>
          <p className="stage-kicker">{isEditing ? 'Editing set' : 'New set'}</p><h1 className="mt-2 text-4xl font-display font-bold mb-2">
            {isEditing ? 'Edit Quiz' : 'Create Quiz'}
          </h1>
          <p className="text-muted-foreground font-body">Shape the questions, then bring the set to the main stage.</p>
        </motion.div>

        {/* Quiz Details */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="stage-panel rounded-lg p-5 mb-5 space-y-4"
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
        <Button onClick={handleSaveQuiz} disabled={saving || !title.trim() || questions.length === 0} className="hidden h-12 w-full lg:flex"><Save />{saving ? 'Saving…' : `Save quiz · ${questions.length}`}</Button>
        </aside>

        {/* Questions List */}
        <section className="space-y-4 mb-6">
          <div className="flex items-end justify-between border-b border-border pb-4"><div><p className="stage-kicker">Run of show</p><h2 className="mt-1 text-2xl font-display font-bold">Questions</h2></div><span className="font-display text-3xl font-bold text-primary tabular-nums">{String(questions.length).padStart(2,'0')}</span></div>

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
              className="w-full h-14 border-dashed"
            >
              <Plus /> Add question
            </Button>
          )}
        </section>

        {/* Save Quiz */}
        <motion.div className="lg:hidden" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Button
            onClick={handleSaveQuiz}
            disabled={saving || !title.trim() || questions.length === 0}
            className="w-full h-14"
          >
            <Save />{saving ? 'Saving…' : `Save quiz · ${questions.length}`}
          </Button>
        </motion.div>
      </div>
    </QuizScreen>
  );
}
