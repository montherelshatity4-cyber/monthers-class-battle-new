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
        { error: 'Question, player, and answer are required.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: player } = await supabase
      .from('players')
      .select('id, game_id')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: 'Student not found in this game.' },
        { status: 404 }
      );
    }

    const { data: question } = await supabase
      .from('questions')
      .select('id, game_id')
      .eq('id', questionId)
      .eq('game_id', gameId)
      .single();

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found.' },
        { status: 404 }
      );
    }

    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', questionId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'You already answered this question.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('answers')
      .insert({
        game_id: gameId,
        question_id: questionId,
        player_id: playerId,
        answer_text: answerText.trim(),
        result: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer: data });
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
