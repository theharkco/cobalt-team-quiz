export type CanvasStatus = 'lobby' | 'playing' | 'finished';
export type CanvasPhase = 'idle' | 'drawing' | 'grace' | 'reveal';

export interface CanvasGame {
  id: string;
  session_id: string;
  status: CanvasStatus;
  duration_seconds: number;
  game_ends_at: string | null;
  team_score: number;
  masterpiece_index: number;
  addition_index: number;
  current_artist_id: string | null;
  last_artist_id: string | null;
  phase: CanvasPhase;
  addition_started_at: string | null;
  addition_seconds: number;
  revealed_answer: string | null;
  last_result: 'success' | 'fail' | 'skipped' | null;
  last_points: number;
  scene: string[];
  total_additions: number;
  round_artist_ids: string[];
  used_answers: string[];
  words_attempted: number;
  rescue_count: number;
}

export interface CanvasPlayer {
  id: string;
  name: string;
  color: string;
  session_id: string;
  draw_count: number;
  canvas_score: number;
  created_at?: string;
}

export type Point = [number, number];

export interface CanvasStroke {
  id: string;
  game_id: string;
  masterpiece_index: number;
  addition_index: number;
  artist_id: string;
  color: string;
  width: number;
  points: Point[];
}

export interface LiveStroke { key: string; color: string; width: number; points: Point[] }

export interface CanvasGuess {
  id: string;
  game_id: string;
  player_id: string;
  masterpiece_index: number;
  addition_index: number;
  guess: string;
  is_correct: boolean;
  points_earned: number;
  created_at: string;
}

export interface CanvasMasterpiece {
  id: string;
  masterpiece_index: number;
  scene: string[];
  additions: number;
  points: number;
  image_data: string | null;
}
