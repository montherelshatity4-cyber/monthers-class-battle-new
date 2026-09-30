export type GameStatus = 'lobby' | 'active' | 'paused' | 'finished';

export interface Game {
  id: string;
  pin: string;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}
export interface Question {
  id: string;
  game_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  question_order: number;
  created_at: string;
} 
