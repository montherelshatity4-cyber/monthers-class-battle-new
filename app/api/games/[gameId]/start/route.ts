import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

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
    .select('id, status')
    .eq('id', gameId)
    .eq('teacher_token', token)
    .single();

  if (gameError || !game) {
    return NextResponse.json(
      { error: 'Invalid teacher session.' },
      { status: 403 }
    );
  }

  // Get the first question.
  const { data: firstQuestion, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .eq('game_id', gameId)
    .order('question_order')
    .limit(1)
    .maybeSingle();

  if (questionError) {
    return NextResponse.json(
      { error: questionError.message },
      { status: 500 }
    );
  }

  if (!firstQuestion) {
    return NextResponse.json(
      { error: 'Add at least one question before starting the battle.' },
      { status: 400 }
    );
  }

  // Start the battle with the first question.
  const { error: updateError } = await supabase
    .from('games')
    .update({
      status: 'active',
      current_question_id: firstQuestion.id,
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
    currentQuestionId: firstQuestion.id,
  });
}
