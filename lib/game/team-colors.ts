import type { TeamColor } from '@/types/team';

export const TEAM_COLOR_STYLES: Record<TeamColor, string> = {
  RED: 'bg-red-500 border-red-600 text-white',
  BLUE: 'bg-blue-500 border-blue-600 text-white',
  GREEN: 'bg-emerald-500 border-emerald-600 text-white',
  YELLOW: 'bg-yellow-400 border-yellow-500 text-slate-900',
};

export const TEAM_COLORS: TeamColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
