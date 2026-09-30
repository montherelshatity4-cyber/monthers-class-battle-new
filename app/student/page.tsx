'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentJoinPage() {
  const router = useRouter();

  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pinFromUrl = new URLSearchParams(window.location.search).get('pin');

    if (pinFromUrl) {
      setPin(pinFromUrl);
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/games/join', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pin,
          displayName: name,
          teamName,
          color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to join the battle.');
        setLoading(false);
        return;
      }

      // Save both the player and the team on this device.
      localStorage.setItem(`player_${data.game.id}`, data.player.id);
      localStorage.setItem(`team_${data.game.id}`, data.team.id);

      router.push(`/student/game/${data.game.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
      <section className="w-full rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400">
            Monther&apos;s Class Battle
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Join the Battle
          </h1>

          <p className="mt-3 text-slate-400">
            Enter your team information to join.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Game PIN
            </label>

            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="123456"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 text-center text-xl font-black tracking-widest outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Your Name
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Enter your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Team Name
            </label>

            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
              placeholder="Enter your team name"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Team Color
            </label>

            <select
              value={color}
              onChange={(event) => setColor(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 outline-none focus:border-cyan-400"
            >
              <option value="">Choose a color</option>
              <option value="RED">Red</option>
              <option value="BLUE">Blue</option>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
            </select>
          </div>

          {error && (
            <div
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center text-sm font-bold text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 px-5 py-4 text-lg font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Battle'}
          </button>
        </form>
      </section>
    </main>
  );
}
