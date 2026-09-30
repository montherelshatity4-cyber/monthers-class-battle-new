export type GameStatus = 'lobby' | 'active' | 'paused' | 'finished';

export interface Game {
  id: string;
  pin: string;
  status: GameStatus;
  current_question_id: string | null;
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
  money: number;
  question_order: number;
  created_at: string;
}
