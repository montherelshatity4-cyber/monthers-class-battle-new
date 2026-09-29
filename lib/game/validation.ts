import { z } from 'zod';

export const TEAM_COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const;
export type TeamColor = (typeof TEAM_COLORS)[number];

export const joinGameSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'Game PIN must be six digits.'),
  displayName: z.string().trim().min(1, 'Enter your name.').max(40, 'Name is too long.'),
  teamName: z.string().trim().min(1, 'Enter a team name.').max(40, 'Team name is too long.'),
  color: z.enum(TEAM_COLORS),
});

export const startGameSchema = z.object({ gameId: z.string().uuid(), teacherToken: z.string().min(20) });

export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}
