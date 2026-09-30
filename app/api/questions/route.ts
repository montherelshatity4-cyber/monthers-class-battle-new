import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
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

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('teacher_token', token)
    .single();

  if (!game) {
    return NextResponse.json(
      { error: 'Invalid teacher session.' },
      { status: 403 }
    );
  }

  const body = await request.json();

  const {
    questionText,
    questionType,
    options,
    correctAnswer,
    points,
    questionOrder,
  } = body;

  if (!questionText || !correctAnswer) {
    return NextResponse.json(
      { error: 'Question and correct answer are required.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('questions')
    .insert({
      game_id: gameId,
      question_text: questionText,
      question_type: questionType ?? 'multiple_choice',
      options: options ?? [],
      correct_answer: correctAnswer,
      points: points ?? 100,
      question_order: questionOrder ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ question: data });
}
