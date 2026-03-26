import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { QuestionFormData } from './QuestionEditor';

interface SortableQuestionCardProps {
  id: string;
  index: number;
  data: QuestionFormData;
  onClick: () => void;
}

export default function SortableQuestionCard({ id, index, data, onClick }: SortableQuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-display font-bold text-foreground text-sm shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body font-bold text-foreground truncate">{data.question}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className="text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {data.type}
          </span>
          {data.category && (
            <span className="text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {data.category}
            </span>
          )}
          <span className="text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {data.difficulty}
          </span>
          <span className="text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            ⏱️ {data.timeLimitSeconds}s
          </span>
        </div>
      </div>
      <span className="text-muted-foreground text-sm">✏️</span>
    </div>
  );
}
