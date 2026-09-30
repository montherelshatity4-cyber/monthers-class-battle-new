'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game, Player, Team, Question } from '@/types';
import { TEAM_COLOR_STYLES } from '@/lib/game/team-colors';

export default function TeacherGamePage() {
  const { gameId } = useParams<{ gameId: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [options, setOptions] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [points, setPoints] = useState('100');

  const load = async () => {
    const response = await fetch(`/api/games/${gameId}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
    } else {
      setGame(data.game);
      setTeams(data.teams ?? []);
      setPlayers(data.players ?? []);
      setQuestions(data.questions ?? []);
    }
  };

  useEffect(() => {
    void load();

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `game_id=eq.${gameId}`,
        },
        () => void load()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        () => void load()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => void load()
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const start = async () => {
    setStarting(true);
    setError('');

    const response = await fetch(`/api/games/${gameId}/start`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
    } else {
      await load();
    }

    setStarting(false);
  };

  const addQuestion = async (event: React.FormEvent) => {
    event.preventDefault();

    setAddingQuestion(true);
    setError('');

    const optionList = options
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);

    const response = await fetch(`/api/games/${gameId}/questions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        questionText,
        questionType,
        options: optionList,
        correctAnswer,
        points: Number(points) || 100,
        questionOrder: questions.length,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
    } else {
      setQuestionText('');
      setQuestionType('multiple_choice');
      setOptions('');
      setCorrectAnswer('');
      setPoints('100');
      await load();
    }

    setAddingQuestion(false);
  };

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student?pin=${game?.pin ?? ''}`
      : '';

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
            Teacher control room
          </p>

          <h1 className="mt-2 text-4xl font-black">
            {game?.status === 'active'
              ? 'Battle in progress'
              : 'Waiting for teams'}
          </h1>
        </div>

        <div className="rounded-2xl border border-cyan-400/40 bg-slate-900 px-6 py-4 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Game PIN
          </p>

          <p className="text-4xl font-black tracking-[0.25em] text-cyan-400">
            {game?.pin ?? '------'}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/20 p-4 text-red-200">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <section className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`rounded-2xl border-2 p-5 ${TEAM_COLOR_STYLES[team.color]}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">
                  {team.custom_name}
                </h2>

                <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold">
                  {team.color}
                </span>
              </div>

              <p className="mt-4 font-semibold">
                {
                  players.filter(
                    (player) => player.team_id === team.id
                  ).length
                }{' '}
                players
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {players
                  .filter((player) => player.team_id === team.id)
                  .map((player) => (
                    <span
                      key={player.id}
                      className="rounded-full bg-black/20 px-3 py-1 text-sm"
                    >
                      {player.display_name}
                    </span>
                  ))}
              </div>

              <p className="mt-4 text-lg font-black">
                Score: {team.score}
              </p>
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

              <p className="mt-2 break-all text-xs text-slate-700">
                Scan to join
              </p>
            </div>
          )}

          <button
            disabled={
              starting ||
              !teams.length ||
              game?.status !== 'lobby'
            }
            onClick={start}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {starting ? 'Starting…' : 'Start Battle'}
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            {game?.status === 'active'
              ? 'Battle started'
              : 'You need at least one team.'}
          </p>
        </aside>
      </div>

      <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
              Questions
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Build your battle
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Add any questions you want to use in your class.
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
            {questions.length} question
            {questions.length === 1 ? '' : 's'}
          </div>
        </div>

        <form
          onSubmit={addQuestion}
          className="mt-6 grid gap-5"
        >
          <label className="block text-sm font-bold">
            Question
            <textarea
              required
              value={questionText}
              onChange={(event) =>
                setQuestionText(event.target.value)
              }
              placeholder="Write your question here..."
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-bold">
              Question type

              <select
                value={questionType}
                onChange={(event) =>
                  setQuestionType(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              >
                <option value="multiple_choice">
                  Multiple choice
                </option>

                <option value="true_false">
                  True / False
                </option>

                <option value="short_answer">
                  Short answer
                </option>
              </select>
            </label>

            <label className="block text-sm font-bold">
              Points

              <input
                type="number"
                min="1"
                value={points}
                onChange={(event) =>
                  setPoints(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              />
            </label>
          </div>

          <label className="block text-sm font-bold">
            Options
            <span className="ml-2 font-normal text-slate-400">
              (one option per line)
            </span>

            <textarea
              value={options}
              onChange={(event) =>
                setOptions(event.target.value)
              }
              placeholder={`A\nB\nC\nD`}
              className="mt-2 min-h-32 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
            />
          </label>

          <label className="block text-sm font-bold">
            Correct answer

            <input
              required
              value={correctAnswer}
              onChange={(event) =>
                setCorrectAnswer(event.target.value)
              }
              placeholder="Write the correct answer"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
            />
          </label>

          <button
            type="submit"
            disabled={addingQuestion}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {addingQuestion
              ? 'Adding question…'
              : 'Add Question'}
          </button>
        </form>

        {questions.length > 0 && (
          <div className="mt-8 grid gap-4">
            <h3 className="font-black">Your questions</h3>

            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-700 bg-slate-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                      Question {index + 1}
                    </p>

                    <p className="mt-2 text-lg font-bold">
                      {question.question_text}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-slate-950">
                    {question.points} pts
                  </span>
                </div>

                {question.options?.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <div
                        key={option}
                        className={`rounded-lg border p-3 ${
                          option === question.correct_answer
                            ? 'border-emerald-400 bg-emerald-400/10'
                            : 'border-slate-600'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-sm text-emerald-300">
                  Correct answer: {question.correct_answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QRCode({ value }: { value: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    import('qrcode')
      .then(({ default: QR }) =>
        QR.toDataURL(value, {
          width: 220,
          margin: 1,
        })
      )
      .then(setSrc);
  }, [value]);

  return src ? (
    <img
      src={src}
      alt="QR code to join this game"
      className="mx-auto h-52 w-52"
    />
  ) : (
    <div className="h-52 w-52 animate-pulse bg-slate-200" />
  );
}
