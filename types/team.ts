export type TeamColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';

export interface Team {
  id: string;
  game_id: string;
  color: TeamColor;
  custom_name: string;
  score: number;
  created_at: string;
}
