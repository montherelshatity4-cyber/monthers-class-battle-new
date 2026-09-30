import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Only the teacher can judge answers.
    const token = (await cookies()).get(`teacher_${gameId}`)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Teacher authorization required.' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verify the teacher session.
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('teacher_token', token)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Invalid teacher session.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { questionId, result } = body;

    if (!questionId || !['correct', 'wrong'].includes(result)) {
      return NextResponse.json(
        { error: 'Question ID and a valid result are required.' },
        { status: 400 }
      );
    }

    // Get the current claim.
    const { data: claim, error: claimError } = await supabase
      .from('question_claims')
      .select(
        'id, game_id, question_id, team_id, player_id, answer_text, result'
      )
      .eq('game_id', gameId)
      .eq('question_id', questionId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'No team has answered this question yet.' },
        { status: 404 }
      );
    }

    if (claim.result !== 'pending') {
      return NextResponse.json(
        { error: 'This answer has already been judged.' },
        { status: 409 }
      );
    }

    // Get the hidden money value.
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, money')
      .eq('id', questionId)
      .eq('game_id', gameId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found.' },
        { status: 404 }
      );
    }

    // Mark the claim as correct or wrong.
    const { data: updatedClaim, error: updateError } = await supabase
      .from('question_claims')
      .update({ result })
      .eq('id', claim.id)
      .eq('result', 'pending')
      .select()
      .single();

    if (updateError || !updatedClaim) {
      return NextResponse.json(
        {
          error:
            updateError?.message ?? 'Unable to judge this answer.',
        },
        { status: 500 }
      );
    }

    // Only a correct answer adds the hidden money to the team's total.
    if (result === 'correct') {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, score')
        .eq('id', claim.team_id)
        .eq('game_id', gameId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: 'Team not found.' },
          { status: 404 }
        );
      }

      const newScore = team.score + question.money;

      const { error: scoreError } = await supabase
        .from('teams')
        .update({ score: newScore })
        .eq('id', team.id)
        .eq('game_id', gameId);

      if (scoreError) {
        return NextResponse.json(
          { error: scoreError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      result,
      claim: updatedClaim,
      moneyAwarded: result === 'correct' ? question.money : 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to judge the answer.',
      },
      { status: 500 }
    );
  }
}
