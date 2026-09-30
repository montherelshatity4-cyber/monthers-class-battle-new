import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const supabase = createSupabaseAdminClient();

  const [{ data: game }, { data: teams }, { data: players }, { data: questions }] =
    await Promise.all([
      supabase
        .from('games')
        .select('id, pin, status, created_at, updated_at')
        .eq('id', gameId)
        .single(),

      supabase
        .from('teams')
        .select('id, game_id, color, custom_name, score, created_at')
        .eq('game_id', gameId)
        .order('created_at'),

      supabase
        .from('players')
        .select('id, game_id, team_id, display_name, joined_at')
        .eq('game_id', gameId)
        .order('joined_at'),

      supabase
        .from('questions')
        .select(
          'id, game_id, question_text, question_type, options, correct_answer, points, question_order, created_at'
        )
        .eq('game_id', gameId)
        .order('question_order'),
    ]);

  if (!game) {
    return NextResponse.json(
      { error: 'Game not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    game,
    teams: teams ?? [],
    players: players ?? [],
    questions: questions ?? [],
  });
}
