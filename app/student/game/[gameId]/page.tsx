'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game, Question } from '@/types';

type Feedback = 'correct' | 'wrong' | null;

export default function StudentGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setGame(data.game);
      setQuestions(data.questions ?? []);
    };

    void load();

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`student-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGame(payload.new as Game);
          void load();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions',
          filter: `game_id=eq.${gameId}`,
        },
        () => void load()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'answers',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const answer = payload.new as {
            id: string;
            result: string;
          };

          if (answer.result === 'correct') {
            setFeedback('correct');
            playCorrectSound();
          }

          if (answer.result === 'wrong') {
            setFeedback('wrong');
            playWrongSound();
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const playCorrectSound = () => {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const now = audio.currentTime;

    const oscillator1 = audio.createOscillator();
    const oscillator2 = audio.createOscillator();
    const gain = audio.createGain();

    oscillator1.type = 'triangle';
    oscillator2.type = 'triangle';

    oscillator1.frequency.setValueAtTime(523.25, now);
    oscillator1.frequency.setValueAtTime(659.25, now + 0.25);
    oscillator1.frequency.setValueAtTime(783.99, now + 0.5);

    oscillator2.frequency.setValueAtTime(659.25, now);
    oscillator2.frequency.setValueAtTime(783.99, now + 0.25);
    oscillator2.frequency.setValueAtTime(1046.5, now + 0.5);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    oscillator1.connect(gain);
    oscillator2.connect(gain);
    gain.connect(audio.destination);

    oscillator1.start(now);
    oscillator2.start(now);

    oscillator1.stop(now + 0.9);
    oscillator2.stop(now + 0.9);

    window.setTimeout(() => {
      void audio.close();
    }, 1100);
  };

  const playWrongSound = () => {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const now = audio.currentTime;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, now);
    oscillator.frequency.exponentialRampToValueAtTime(70, now + 0.8);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.85);

    window.setTimeout(() => {
      void audio.close();
    }, 1050);
  };

  const answerQuestion = async (answer: string) => {
    if (!currentQuestion || !answer.trim() || sending) return;

    const playerId = localStorage.getItem(`player_${gameId}`);

    if (!playerId) {
      setError('Student session not found. Please join the game again.');
      return;
    }

    setSelectedAnswer(answer);
    setSending(true);

    const response = await fetch(`/api/games/${gameId}/answers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        questionId: currentQuestion.id,
        playerId,
        answerText: answer,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? 'Unable to send answer.');
      setSending(false);
      return;
    }

    setSending(false);
  };

  if (error) {
    return (
      <main className="p-10 text-center text-red-300">
        {error}
      </main>
    );
  }

  const currentQuestion = questions[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <div className="text-center">
        <div
          className={`mx-auto mb-4 h-4 w-4 rounded-full ${
            connected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />

        <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
          {connected ? 'Live connection' : 'Reconnecting…'}
        </p>
      </div>

      {game?.status === 'active' ? (
        currentQuestion ? (
          <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950">
                Question 1
              </span>

              <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold">
                {currentQuestion.points} points
              </span>
            </div>

            <h1 className="mt-8 text-center text-3xl font-black leading-tight sm:text-4xl">
              {currentQuestion.question_text}
            </h1>

            {currentQuestion.options?.length > 0 ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    disabled={sending || !!selectedAnswer}
                    onClick={() => void answerQuestion(option)}
                    className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-5 text-left text-lg font-bold transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="mr-3 text-cyan-400">
                      {String.fromCharCode(65 + index)}.
                    </span>

                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <input
                  value={selectedAnswer}
                  disabled={sending}
                  onChange={(event) =>
                    setSelectedAnswer(event.target.value)
                  }
                  placeholder="Type your answer..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-4 text-lg"
                />

                <button
                  type="button"
                  disabled={!selectedAnswer.trim() || sending}
                  onClick={() => void answerQuestion(selectedAnswer)}
                  className="mt-4 w-full rounded-xl bg-cyan-400 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? 'Sending...' : 'Send Answer'}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-600 bg-slate-900 p-10 text-center">
            <h1 className="text-3xl font-black">Battle started!</h1>

            <p className="mt-4 text-lg text-slate-400">
              Your teacher is getting the questions ready...
            </p>
          </section>
        )
      ) : (
        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center">
          <h1 className="text-4xl font-black">You're in!</h1>

          <p className="mt-4 text-xl text-slate-300">
            Wait for your teacher to start the battle.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-8 rounded-xl border border-slate-600 px-5 py-3"
          >
            Leave game
          </button>
        </section>
      )}

      {feedback && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          aria-live="assertive"
        >
          <div
            className={`flex h-64 w-64 items-center justify-center rounded-full border-8 bg-slate-950 text-[180px] font-black leading-none shadow-2xl sm:h-80 sm:w-80 sm:text-[230px] ${
              feedback === 'correct'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-red-500 text-red-500'
            }`}
          >
            {feedback === 'correct' ? '✓' : '✕'}
          </div>
        </div>
      )}
    </main>
  );
}
