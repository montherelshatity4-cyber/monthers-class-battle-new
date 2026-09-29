import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const token = (await cookies()).get(`teacher_${gameId}`)?.value;
  if (!token) return NextResponse.json({ error: 'Teacher authorization required.' }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from('games').select('id').eq('id', gameId).eq('teacher_token', token).single();
  if (!data) return NextResponse.json({ error: 'Invalid teacher session.' }, { status: 403 });
  const { error } = await supabase.from('games').update({ status: 'active' }).eq('id', gameId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
