'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game, Question } from '@/types';

type Feedback = 'correct' | 'wrong' | null;

type Team = {
  id: string;
  custom_name: string;
  color: string;
  score: number;
};

type Claim = {
  id: string;
  game_id: string;
  question_id: string;
  team_id: string;
  player_id: string;
  answer_text: string;
  result: 'pending' | 'correct' | 'wrong';
  created_at: string;
};

export default function StudentGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [claim, setClaim] = useState<Claim | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [sending, setSending] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const storedTeamId = localStorage.getItem(`team_${gameId}`);
    const storedPlayerId = localStorage.getItem(`player_${gameId}`);

    setTeamId(storedTeamId);
    setPlayerId(storedPlayerId);
  }, [gameId]);

  const load = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to load the game.');
        return;
      }

      setGame(data.game);
      setQuestions(data.questions ?? []);
      setTeams(data.teams ?? []);
      setClaim(data.currentClaim ?? null);
    } catch {
      setError('Unable to connect to the game.');
    }
  };

  const prepareAudio = () => {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audio = audioContextRef.current;

    if (audio.state === 'suspended') {
      void audio.resume();
    }
  };

  const playCorrectSound = () => {
    const audio = audioContextRef.current;

    if (!audio) return;

    if (audio.state === 'suspended') {
      void audio.resume();
    }

    const now = audio.currentTime;

    const oscillator1 = audio.createOscillator();
    const oscillator2 = audio.createOscillator();
    const gain = audio.createGain();

    oscillator1.type = 'triangle';
    oscillator2.type = 'triangle';

    oscillator1.frequency.setValueAtTime(523.25, now);
    oscillator1.frequency.setValueAtTime(659.25, now + 0.35);
    oscillator1.frequency.setValueAtTime(783.99, now + 0.7);
    oscillator1.frequency.setValueAtTime(1046.5, now + 1.05);

    oscillator2.frequency.setValueAtTime(659.25, now);
    oscillator2.frequency.setValueAtTime(783.99, now + 0.35);
    oscillator2.frequency.setValueAtTime(1046.5, now + 0.7);
    oscillator2.frequency.setValueAtTime(1318.5, now + 1.05);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    oscillator1.connect(gain);
    oscillator2.connect(gain);
    gain.connect(audio.destination);

    oscillator1.start(now);
    oscillator2.start(now);

    oscillator1.stop(now + 1.5);
    oscillator2.stop(now + 1.5);
  };

  const playWrongSound = () => {
    const audio = audioContextRef.current;

    if (!audio) return;

    if (audio.state === 'suspended') {
      void audio.resume();
    }

    const now = audio.currentTime;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = 'sawtooth';

    oscillator.frequency.setValueAtTime(240, now);
    oscillator.frequency.exponentialRampToValueAtTime(80, now + 1.4);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 1.5);
  };

  useEffect(() => {
    void load();

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`student-battle-${gameId}`)

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          setSelectedAnswer('');
          setClaim(null);
          setFeedback(null);
          setSending(false);

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
        () => {
          void load();
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'question_claims',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newClaim = payload.new as Claim;

          setClaim(newClaim);
          setSelectedAnswer(newClaim.answer_text);
          setSending(false);
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'question_claims',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const updatedClaim = payload.new as Claim;

          setClaim(updatedClaim);

          if (updatedClaim.result === 'correct') {
            setFeedback('correct');
            playCorrectSound();
          }

          if (updatedClaim.result === 'wrong') {
            setFeedback('wrong');
            playWrongSound();
          }

          void load();
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void load();
        }
      )

      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      void supabase.removeChannel(channel);

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [gameId]);

  const answerQuestion = async (answer: string) => {
    if (!currentQuestion || !answer.trim() || sending || claim) {
      return;
    }

    if (!playerId || !teamId) {
      setError('Team session not found. Please join the game again.');
      return;
    }

    prepareAudio();

    setSelectedAnswer(answer);
    setSending(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameId}/answers`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          playerId,
          answerText: answer.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setClaim(data.winner ?? null);
        setSending(false);
        return;
      }

      if (!response.ok) {
        setError(data.error ?? 'Unable to send answer.');
        setSending(false);
        return;
      }

      setClaim(data.claim);
      setSending(false);
    } catch {
      setError('Connection problem. Please try again.');
      setSending(false);
    }
  };

  const currentQuestion = questions.find(
    (question) => question.id === game?.current_question_id
  );

  const myTeam = teams.find((team) => team.id === teamId);

  const winningTeam = claim
    ? teams.find((team) => team.id === claim.team_id)
    : null;

  const isWinner = !!claim && claim.team_id === teamId;

  if (error && !game) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-red-300">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 sm:px-8 sm:py-10">
      <header className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-400">
          Monther&apos;s Class Battle
        </p>

        {myTeam && (
          <>
            <h1 className="mt-4 text-4xl font-black sm:text-5xl">
              {myTeam.custom_name}
            </h1>

            <p
              className={`mt-3 text-3xl font-black ${
                myTeam.score < 0
                  ? 'text-red-400'
                  : 'text-emerald-300'
              }`}
            >
              {myTeam.score}
            </p>

            <p className="text-sm font-bold text-slate-500">
              Money
            </p>
          </>
        )}

        <div className="mt-4 flex items-center justify-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              connected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />

          <span className="text-sm font-bold text-slate-400">
            {connected ? 'Live connection' : 'Reconnecting...'}
          </span>
        </div>
      </header>

      {game?.status === 'lobby' && (
        <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-black">
            You&apos;re in!
          </h2>

          <p className="mt-4 text-lg text-slate-400">
            Wait for your teacher to start the battle.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-8 rounded-xl border border-slate-600 px-6 py-3 font-bold"
          >
            Leave Game
          </button>
        </section>
      )}

      {game?.status === 'finished' && (
        <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center sm:p-10">
          <h2 className="text-4xl font-black">
            Battle Finished!
          </h2>

          <p className="mt-4 text-lg text-slate-400">
            Your Final Money
          </p>

          {myTeam && (
            <p
              className={`mt-4 text-6xl font-black ${
                myTeam.score < 0
                  ? 'text-red-400'
                  : 'text-emerald-300'
              }`}
            >
              {myTeam.score}
            </p>
          )}
        </section>
      )}

      {game?.status === 'active' && (
        <>
          {currentQuestion ? (
            <section className="mt-10">
              {claim ? (
                <div className="rounded-3xl border-2 border-cyan-400/40 bg-cyan-400/10 p-8 text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-cyan-400">
                    {isWinner
                      ? 'You answered first!'
                      : 'Another team answered first!'}
                  </p>

                  {winningTeam && (
                    <h2 className="mt-4 text-3xl font-black">
                      {isWinner
                        ? 'LOCKED IN'
                        : `${winningTeam.custom_name} answered first`}
                    </h2>
                  )}

                  {isWinner && (
                    <p className="mt-4 text-lg text-slate-300">
                      Your answer:{' '}
                      <strong>{claim.answer_text}</strong>
                    </p>
                  )}

                  {!isWinner && (
                    <p className="mt-5 text-2xl font-black text-amber-300">
                      TOO LATE
                    </p>
                  )}

                  {claim.result === 'pending' && (
                    <p className="mt-6 text-lg font-black text-amber-300">
                      Waiting for the teacher...
                    </p>
                  )}

                  {claim.result === 'correct' && (
                    <p className="mt-6 text-2xl font-black text-emerald-400">
                      Correct!
                    </p>
                  )}

                  {claim.result === 'wrong' && (
                    <p className="mt-6 text-2xl font-black text-red-400">
                      Wrong answer.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-6 text-center text-lg font-black text-amber-300">
                    Be the first team to answer!
                  </p>

                  {currentQuestion.options?.length > 0 ? (
                    <div className="grid gap-5">
                      {currentQuestion.options.map((option, index) => (
                        <button
                          key={option}
                          type="button"
                          disabled={sending || !!claim}
                          onClick={() => void answerQuestion(option)}
                          className="min-h-24 rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 text-left text-2xl font-black transition active:scale-[0.98] hover:border-cyan-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="mr-4 text-cyan-400">
                            {String.fromCharCode(65 + index)}.
                          </span>

                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <input
                        value={selectedAnswer}
                        disabled={sending || !!claim}
                        onChange={(event) =>
                          setSelectedAnswer(event.target.value)
                        }
                        placeholder="Type your answer..."
                        className="w-full rounded-3xl border border-slate-600 bg-slate-900 p-6 text-xl outline-none focus:border-cyan-400"
                      />

                      <button
                        type="button"
                        disabled={
                          !selectedAnswer.trim() ||
                          sending ||
                          !!claim
                        }
                        onClick={() =>
                          void answerQuestion(selectedAnswer)
                        }
                        className="mt-5 w-full rounded-3xl bg-cyan-400 px-5 py-6 text-xl font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sending ? 'Sending...' : 'Answer Now'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : (
            <section className="mt-10 rounded-3xl border border-dashed border-slate-600 bg-slate-900 p-10 text-center">
              <h2 className="text-3xl font-black">
                Get Ready!
              </h2>

              <p className="mt-4 text-lg text-slate-400">
                Waiting for the next question...
              </p>
            </section>
          )}
        </>
      )}

      {error && game && (
        <p className="mt-5 text-center text-sm font-bold text-red-300">
          {error}
        </p>
      )}

      {feedback && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          aria-live="assertive"
        >
          <div
            className={`flex h-64 w-64 items-center justify-center rounded-full border-8 bg-slate-950 text-[170px] font-black leading-none shadow-2xl sm:h-80 sm:w-80 sm:text-[220px] ${
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
