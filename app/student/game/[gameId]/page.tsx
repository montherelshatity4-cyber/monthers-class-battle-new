'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game } from '@/types';

export default function StudentGamePage() { const { gameId } = useParams<{ gameId: string }>(); const router = useRouter(); const [game, setGame] = useState<Game | null>(null); const [connected, setConnected] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const load = async () => { const response = await fetch(`/api/games/${gameId}`); const data = await response.json(); if (!response.ok) setError(data.error); else setGame(data.game); }; void load(); const supabase = createSupabaseBrowserClient(); const channel = supabase.channel(`student-${gameId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, payload => { const next = payload.new as Game; setGame(next); }).subscribe(status => setConnected(status === 'SUBSCRIBED')); return () => { void supabase.removeChannel(channel); }; }, [gameId]);
  if (error) return <main className="p-10 text-center text-red-300">{error}</main>;
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center"><div className={`mb-6 h-4 w-4 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} title={connected ? 'Connected' : 'Reconnecting'} /><p className="text-sm font-bold uppercase tracking-widest text-cyan-400">{connected ? 'Live connection' : 'Reconnecting…'}</p>{game?.status === 'active' ? <><h1 className="mt-5 text-5xl font-black">Battle started!</h1><p className="mt-4 text-xl text-slate-300">Get ready. The teacher is running the game.</p></> : <><h1 className="mt-5 text-5xl font-black">You’re in!</h1><p className="mt-4 text-xl text-slate-300">Wait for your teacher to start the battle.</p><button onClick={() => router.push('/')} className="mt-8 rounded-xl border border-slate-600 px-5 py-3">Leave game</button></>}</main>;
}
