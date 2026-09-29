'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">Classroom competition</p>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          MONTHER'S<br />
          <span className="text-cyan-400">CLASS BATTLE</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-slate-300">A fast, fun, real-time battle for the whole class.</p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <button
          onClick={() => router.push('/teacher')}
          className="rounded-2xl bg-cyan-400 px-6 py-8 text-xl font-black text-slate-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300"
        >
          Create teacher game
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (/^\d{6}$/.test(pin)) router.push(`/student?pin=${pin}`);
          }}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
        >
          <label className="block text-left text-sm font-bold text-slate-300">Join with Game PIN</label>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-center text-2xl tracking-[0.3em] outline-none focus:border-cyan-400"
          />
          <button className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950">Join game</button>
        </form>
      </div>
    </main>
  );
}
