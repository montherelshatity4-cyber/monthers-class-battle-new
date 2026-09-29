import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { generatePin, generateToken } from '@/lib/game/validation';

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    let pin = generatePin();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data } = await supabase.from('games').select('id').eq('pin', pin).maybeSingle();
      if (!data) break;
      pin = generatePin();
    }
    const teacherToken = generateToken();
    const { data, error } = await supabase.from('games').insert({ pin, teacher_token: teacherToken }).select('id, pin, status, created_at, updated_at').single();
    if (error) throw error;
    const response = NextResponse.json({ game: data });
    response.cookies.set(`teacher_${data.id}`, teacherToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 6, path: '/' });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create game.' }, { status: 500 });
  }
}
