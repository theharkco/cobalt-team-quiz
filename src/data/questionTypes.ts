export type QuestionType = 'multiple-choice' | 'free-text' | 'blurred-image' | 'music' | 'select-wrong';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[]; // for fuzzy matching free text
  imageUrl?: string;
  blurLevels?: number[]; // blur values at different time points (px)
  spotifyEmbedUrl?: string;
  category?: string;
  difficulty?: Difficulty;
  explanation?: string; // shown after the answer is revealed
  correctAnswers?: string[]; // for select-wrong: the correct options (players must avoid these)
  timeLimitSeconds?: number; // per-question time limit, defaults to 15
}

export type MatchQuality = 'exact' | 'close' | 'none';
