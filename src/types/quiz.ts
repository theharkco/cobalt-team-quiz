export type SessionStatus = 'lobby' | 'playing' | 'question' | 'leaderboard' | 'finished';

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  session_id: string;
}

export interface QuizSession {
  id: string;
  join_code: string;
  status: SessionStatus;
  current_question: number;
  question_started_at: string | null;
}
