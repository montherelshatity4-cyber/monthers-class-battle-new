import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get('pin');
  if (!pin) return NextResponse.json({ error: 'PIN is required.' }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('games').select('id, pin, status').eq('pin', pin).single();
  if (error || !data) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  return NextResponse.json({ game: data });
}
