'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherPage() { const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const create = async () => { setLoading(true); const response = await fetch('/api/games', { method: 'POST' }); const data = await response.json(); if (!response.ok) setError(data.error); else router.push(`/teacher/game/${data.game.id}`); setLoading(false); }; return <main className="flex min-h-screen items-center justify-center px-6"><div className="max-w-xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-cyan-400">Teacher setup</p><h1 className="mt-4 text-5xl font-black">Create a new battle</h1><p className="mt-5 text-slate-300">Create a lobby, display the QR code, and watch teams join live.</p>{error && <p className="mt-5 text-red-300">{error}</p>}<button onClick={create} disabled={loading} className="mt-8 rounded-2xl bg-cyan-400 px-8 py-4 text-lg font-black text-slate-950 disabled:opacity-50">{loading ? 'Creating…' : 'Create game'}</button></div></main>; }
