import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const supabase = createSupabaseAdminClient();

    const [
      { data: game, error: gameError },
      { data: teams, error: teamsError },
      { data: players, error: playersError },
      { data: questions, error: questionsError },
    ] = await Promise.all([
      supabase
        .from('games')
        .select(
          'id, pin, status, current_question_id, created_at, updated_at'
        )
        .eq('id', gameId)
        .single(),

      supabase
        .from('teams')
        .select(
          'id, game_id, color, custom_name, score, created_at'
        )
        .eq('game_id', gameId)
        .order('created_at'),

      supabase
        .from('players')
        .select(
          'id, game_id, team_id, display_name, joined_at'
        )
        .eq('game_id', gameId)
        .order('joined_at'),

      supabase
        .from('questions')
        .select(
          'id, game_id, question_text, question_type, options, correct_answer, points, money, question_order, created_at'
        )
        .eq('game_id', gameId)
        .order('question_order'),
    ]);

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found.' },
        { status: 404 }
      );
    }

    if (teamsError) {
      return NextResponse.json(
        { error: teamsError.message },
        { status: 500 }
      );
    }

    if (playersError) {
      return NextResponse.json(
        { error: playersError.message },
        { status: 500 }
      );
    }

    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      );
    }

    // Get the claim for the current question, if there is one.
    let currentClaim = null;

    if (game.current_question_id) {
      const { data: claim, error: claimError } = await supabase
        .from('question_claims')
        .select(
          'id, game_id, question_id, team_id, player_id, answer_text, result, created_at'
        )
        .eq('game_id', gameId)
        .eq('question_id', game.current_question_id)
        .maybeSingle();

      if (claimError) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 500 }
        );
      }

      currentClaim = claim ?? null;
    }

    return NextResponse.json({
      game,
      teams: teams ?? [],
      players: players ?? [],
      questions: questions ?? [],
      currentClaim,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load the game.',
      },
      { status: 500 }
    );
  }
}
