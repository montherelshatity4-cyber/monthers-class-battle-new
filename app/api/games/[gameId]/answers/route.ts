import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const body = await request.json();

    const {
      questionId,
      playerId,
      answerText,
    } = body;

    if (!questionId || !playerId || !answerText?.trim()) {
      return NextResponse.json(
        {
          error: 'Question, player, and answer are required.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Make sure the player belongs to this game
    // and get the team connected to this device.
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, game_id, team_id')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        {
          error: 'Student not found in this game.',
        },
        { status: 404 }
      );
    }

    // Make sure the question belongs to this game.
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, game_id')
      .eq('id', questionId)
      .eq('game_id', gameId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        {
          error: 'Question not found.',
        },
        { status: 404 }
      );
    }

    // Make sure this is the question currently being played.
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, current_question_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        {
          error: 'Game not found.',
        },
        { status: 404 }
      );
    }

    if (game.status !== 'active') {
      return NextResponse.json(
        {
          error: 'The battle is not currently active.',
        },
        { status: 409 }
      );
    }

    if (game.current_question_id !== questionId) {
      return NextResponse.json(
        {
          error: 'This is not the current question.',
        },
        { status: 409 }
      );
    }

    // Atomic server-side first-tap claim.
    //
    // The PostgreSQL function uses the unique question_id constraint
    // to guarantee that only ONE team can win the question.
    const { data: claim, error: claimError } = await supabase.rpc(
      'claim_question',
      {
        p_game_id: gameId,
        p_question_id: questionId,
        p_team_id: player.team_id,
        p_player_id: player.id,
        p_answer_text: answerText.trim(),
      }
    );

    if (claimError) {
      return NextResponse.json(
        {
          error: claimError.message,
        },
        { status: 500 }
      );
    }

    // If another team already claimed the question,
    // PostgreSQL returns no new claim.
    if (!claim) {
      const { data: winner } = await supabase
        .from('question_claims')
        .select(
          'id, game_id, question_id, team_id, player_id, answer_text, result, created_at'
        )
        .eq('question_id', questionId)
        .maybeSingle();

      return NextResponse.json(
        {
          accepted: false,
          winner: winner ?? null,
          message: 'Another team answered first.',
        },
        { status: 409 }
      );
    }

    // This team won the race.
    return NextResponse.json({
      accepted: true,
      claim,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to submit answer.',
      },
      { status: 500 }
    );
  }
}
