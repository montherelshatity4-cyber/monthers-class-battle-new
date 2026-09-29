'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game, Player, Team } from '@/types';
import { TEAM_COLOR_STYLES } from '@/lib/game/team-colors';

export default function TeacherGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const load = async () => {
    const response = await fetch(`/api/games/${gameId}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
    } else {
      setGame(data.game);
      setTeams(data.teams);
      setPlayers(data.players);
    }
  };

  useEffect(() => {
    void load();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
        () => void load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => void load()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => void load()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const start = async () => {
    setStarting(true);
    const response = await fetch(`/api/games/${gameId}/start`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
    } else {
      await load();
    }
    setStarting(false);
  };

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/student?pin=${game?.pin ?? ''}` : '';

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">Teacher control room</p>
          <h1 className="mt-2 text-4xl font-black">Waiting for teams</h1>
        </div>
        <div className="rounded-2xl border border-cyan-400/40 bg-slate-900 px-6 py-4 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">Game PIN</p>
          <p className="text-4xl font-black tracking-[0.25em] text-cyan-400">{game?.pin ?? '------'}</p>
        </div>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-500/20 p-4 text-red-200">{error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <section className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className={`rounded-2xl border-2 p-5 ${TEAM_COLOR_STYLES[team.color]}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">{team.custom_name}</h2>
                <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold">{team.color}</span>
              </div>
              <p className="mt-4 font-semibold">{players.filter((p) => p.team_id === team.id).length} players</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {players
                  .filter((p) => p.team_id === team.id)
                  .map((player) => (
                    <span key={player.id} className="rounded-full bg-black/20 px-3 py-1 text-sm">
                      {player.display_name}
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-600 p-12 text-center text-slate-400 sm:col-span-2">
              Students will appear here as they join.
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="font-bold">Join this battle</h2>
          {joinUrl && (
            <div className="mt-4 rounded-xl bg-white p-3 text-center">
              <QRCode value={joinUrl} />
              <p className="mt-2 break-all text-xs text-slate-700">Scan to join</p>
            </div>
          )}
          <button
            disabled={starting || !teams.length || game?.status !== 'lobby'}
            onClick={start}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {starting ? 'Starting…' : 'Start Battle'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            {game?.status === 'active' ? 'Battle started' : 'You need at least one team.'}
          </p>
        </aside>
      </div>
    </main>
  );
}

function QRCode({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    import('qrcode')
      .then(({ default: QR }) => QR.toDataURL(value, { width: 220, margin: 1 }))
      .then(setSrc);
  }, [value]);
  return src ? (
    <img src={src} alt="QR code to join this game" className="mx-auto h-52 w-52" />
  ) : (
    <div className="h-52 w-52 animate-pulse bg-slate-200" />
  );
}
