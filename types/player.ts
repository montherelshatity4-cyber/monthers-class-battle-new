export interface Player {
  id: string;
  game_id: string;
  team_id: string | null;
  display_name: string;
  joined_at: string;
}
