export type GameStatus = 'lobby' | 'active' | 'paused' | 'finished';

export interface Game {
  id: string;
  pin: string;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}
