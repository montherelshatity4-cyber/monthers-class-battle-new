import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
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
      .select('id, status, current_question_id')
      .eq('id', gameId)
      .eq('teacher_token', token)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Invalid teacher session.' },
        { status: 403 }
      );
    }

    if (game.status !== 'active') {
      return NextResponse.json(
        { error: 'The battle is not currently active.' },
        { status: 409 }
      );
    }

    if (!game.current_question_id) {
      return NextResponse.json(
        { error: 'There is no current question.' },
        { status: 400 }
      );
    }

    // Find the current question.
    const { data: currentQuestion, error: currentQuestionError } =
      await supabase
        .from('questions')
        .select('id, question_order')
        .eq('id', game.current_question_id)
        .eq('game_id', gameId)
        .single();

    if (currentQuestionError || !currentQuestion) {
      return NextResponse.json(
        { error: 'Current question not found.' },
        { status: 404 }
      );
    }

    // Find the next question.
    const { data: nextQuestion, error: nextQuestionError } =
      await supabase
        .from('questions')
        .select('id, question_order')
        .eq('game_id', gameId)
        .gt('question_order', currentQuestion.question_order)
        .order('question_order')
        .limit(1)
        .maybeSingle();

    if (nextQuestionError) {
      return NextResponse.json(
        { error: nextQuestionError.message },
        { status: 500 }
      );
    }

    // No more questions: finish the battle.
    if (!nextQuestion) {
      const { error: finishError } = await supabase
        .from('games')
        .update({
          status: 'finished',
          current_question_id: null,
        })
        .eq('id', gameId);

      if (finishError) {
        return NextResponse.json(
          { error: finishError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        finished: true,
      });
    }

    // Move everyone to the next question.
    const { error: updateError } = await supabase
      .from('games')
      .update({
        current_question_id: nextQuestion.id,
      })
      .eq('id', gameId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      finished: false,
      currentQuestionId: nextQuestion.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to move to the next question.',
      },
      { status: 500 }
    );
  }
}
