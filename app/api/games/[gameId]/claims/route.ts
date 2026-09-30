import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const url = new URL(request.url);
    const questionId = url.searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: claim, error } = await supabase
      .from('question_claims')
      .select(
        'id, game_id, question_id, team_id, player_id, answer_text, result, created_at'
      )
      .eq('game_id', gameId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      claim: claim ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load question claim.',
      },
      { status: 500 }
    );
  }
}
