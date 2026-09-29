import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { joinGameSchema } from '@/lib/game/validation';

export async function POST(request: Request) {
  try {
    const input = joinGameSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data: game, error: gameError } = await supabase.from('games').select('id, pin, status').eq('pin', input.pin).maybeSingle();
    if (gameError) throw gameError;
    if (!game) return NextResponse.json({ error: 'Game not found. Check the PIN.' }, { status: 404 });
    if (game.status !== 'lobby') return NextResponse.json({ error: 'This battle has already started.' }, { status: 409 });

    const { data: team, error: teamError } = await supabase.from('teams').upsert({ game_id: game.id, color: input.color, custom_name: input.teamName }, { onConflict: 'game_id,color', ignoreDuplicates: true }).select('id, game_id, color, custom_name, score, created_at').maybeSingle();
    if (teamError) throw teamError;
    let selectedTeam = team;
    if (!selectedTeam) {
      const { data: existing } = await supabase.from('teams').select('id, game_id, color, custom_name, score, created_at').eq('game_id', game.id).eq('color', input.color).single();
      if (!existing) return NextResponse.json({ error: 'That team color was just taken. Choose another.' }, { status: 409 });
      if (existing.custom_name.toLowerCase() !== input.teamName.toLowerCase()) return NextResponse.json({ error: 'That color is already assigned to another team.' }, { status: 409 });
      selectedTeam = existing;
    }
    const { data: player, error: playerError } = await supabase.from('players').insert({ game_id: game.id, team_id: selectedTeam.id, display_name: input.displayName }).select('id, game_id, team_id, display_name, joined_at').single();
    if (playerError) throw playerError;
    return NextResponse.json({ game, team: selectedTeam, player });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to join game.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
