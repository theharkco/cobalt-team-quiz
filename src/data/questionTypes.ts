export type QuestionType = 'multiple-choice' | 'free-text' | 'blurred-image' | 'music';

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
}

export type MatchQuality = 'exact' | 'close' | 'none';
