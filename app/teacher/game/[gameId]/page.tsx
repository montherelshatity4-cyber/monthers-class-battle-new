'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Game, Player, Team, Question } from '@/types';
import { TEAM_COLOR_STYLES } from '@/lib/game/team-colors';

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

export default function TeacherGamePage() {
  const { gameId } = useParams<{ gameId: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);

  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [judging, setJudging] = useState(false);
  const [movingNext, setMovingNext] = useState(false);

  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [options, setOptions] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [money, setMoney] = useState('100');

  const load = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to load the game.');
        return;
      }

      setGame(data.game);
      setTeams(data.teams ?? []);
      setPlayers(data.players ?? []);
      setQuestions(data.questions ?? []);
      setClaim(data.currentClaim ?? null);
    } catch {
      setError('Unable to connect to the game.');
    }
  };

  useEffect(() => {
    void load();

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`teacher-battle-${gameId}`)

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
        () => {
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
          event: 'INSERT',
          schema: 'public',
          table: 'question_claims',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setClaim(payload.new as Claim);
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
          setClaim(payload.new as Claim);
          void load();
        }
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const start = async () => {
    setStarting(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to start the battle.');
      } else {
        await load();
      }
    } catch {
      setError('Unable to start the battle.');
    } finally {
      setStarting(false);
    }
  };

  const addQuestion = async (event: React.FormEvent) => {
    event.preventDefault();

    setAddingQuestion(true);
    setError('');

    const optionList = options
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);

    const moneyValue = Number(money);

    if (!Number.isFinite(moneyValue) || moneyValue < 0) {
      setError('Money must be a valid number.');
      setAddingQuestion(false);
      return;
    }

    try {
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
          money: moneyValue,
          questionOrder: questions.length,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to add question.');
      } else {
        setQuestionText('');
        setQuestionType('multiple_choice');
        setOptions('');
        setCorrectAnswer('');
        setMoney('100');
        await load();
      }
    } catch {
      setError('Unable to add question.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const judgeAnswer = async (result: 'correct' | 'wrong') => {
    if (!claim || claim.result !== 'pending' || judging) {
      return;
    }

    setJudging(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameId}/judge`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          questionId: claim.question_id,
          result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to judge the answer.');
        return;
      }

      setClaim(data.claim);
      await load();
    } catch {
      setError('Unable to judge the answer.');
    } finally {
      setJudging(false);
    }
  };

  const nextQuestion = async () => {
    if (movingNext) {
      return;
    }

    setMovingNext(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameId}/next`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to move to the next question.');
        return;
      }

      setClaim(null);
      await load();
    } catch {
      setError('Unable to move to the next question.');
    } finally {
      setMovingNext(false);
    }
  };

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student?pin=${game?.pin ?? ''}`
      : '';

  const currentQuestion = questions.find(
    (question) => question.id === game?.current_question_id
  );

  const currentQuestionNumber = currentQuestion
    ? currentQuestion.question_order + 1
    : 0;

  const totalQuestions = questions.length;

  const winningTeam = claim
    ? teams.find((team) => team.id === claim.team_id)
    : null;

  const winningPlayer = claim
    ? players.find((player) => player.id === claim.player_id)
    : null;

  if (game?.status === 'active') {
    return (
      <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* TOP BAR */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
              Monther&apos;s Class Battle
            </p>

            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              LIVE BATTLE
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-400/40 bg-slate-900 px-5 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Game PIN
              </p>

              <p className="text-2xl font-black tracking-[0.2em] text-cyan-400">
                {game.pin}
              </p>
            </div>

            <div className="rounded-xl bg-cyan-400 px-5 py-3 text-center text-slate-950">
              <p className="text-[10px] font-black uppercase tracking-widest">
                Question
              </p>

              <p className="text-2xl font-black">
                {currentQuestionNumber} / {totalQuestions}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/20 p-4 text-center font-bold text-red-200">
            {error}
          </p>
        )}

        {currentQuestion ? (
          <>
            {/* QUESTION AREA */}
            <section className="mt-5 rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-6 py-2 text-sm font-black uppercase tracking-widest text-emerald-300">
                  Hidden Money: {currentQuestion.money}
                </div>
              </div>

              {/* BIG QUESTION */}
              <div className="mt-5 rounded-3xl bg-slate-950 px-5 py-8 text-center sm:px-10 sm:py-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">
                  Question {currentQuestionNumber}
                </p>

                <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* ANSWER OPTIONS */}
              {currentQuestion.options?.length > 0 && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={option}
                      className="flex min-h-24 items-center rounded-2xl border-2 border-slate-700 bg-slate-800 px-5 py-4 sm:min-h-28 sm:px-7"
                    >
                      <span className="mr-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xl font-black text-slate-950">
                        {String.fromCharCode(65 + index)}
                      </span>

                      <span className="text-xl font-black sm:text-2xl">
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* WAITING */}
              {!claim && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/5 px-5 py-6 text-center">
                  <p className="text-xl font-black uppercase text-amber-300 sm:text-2xl">
                    WAITING FOR THE FIRST TEAM TO ANSWER...
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    All four teams can answer now.
                  </p>
                </div>
              )}

              {/* FIRST ANSWER */}
              {claim && (
                <div className="mt-5 overflow-hidden rounded-3xl border-2 border-cyan-400/60 bg-cyan-400/10">
                  <div className="bg-cyan-400 px-5 py-4 text-center text-slate-950">
                    <p className="text-xl font-black uppercase tracking-widest sm:text-3xl">
                      🚨 TEAM {winningTeam?.custom_name ?? 'UNKNOWN'} ANSWERED FIRST! 🚨
                    </p>
                  </div>

                  <div className="p-5 text-center sm:p-7">
                    {winningPlayer && (
                      <p className="text-sm font-bold text-slate-400">
                        Answered by {winningPlayer.display_name}
                      </p>
                    )}

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                      Selected Answer
                    </p>

                    <div className="mt-3 rounded-2xl bg-slate-950 px-5 py-6">
                      <p className="text-3xl font-black sm:text-4xl">
                        {claim.answer_text}
                      </p>
                    </div>

                    {/* JUDGE */}
                    {claim.result === 'pending' && (
                      <>
                        <p className="mt-5 text-lg font-black uppercase text-amber-300">
                          Teacher: Judge the answer
                        </p>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={judging}
                            onClick={() => void judgeAnswer('correct')}
                            className="min-h-24 rounded-2xl bg-emerald-500 px-6 py-5 text-2xl font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-3xl"
                          >
                            {judging ? 'JUDGING...' : '✓ CORRECT'}
                          </button>

                          <button
                            type="button"
                            disabled={judging}
                            onClick={() => void judgeAnswer('wrong')}
                            className="min-h-24 rounded-2xl bg-red-500 px-6 py-5 text-2xl font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-3xl"
                          >
                            {judging ? 'JUDGING...' : '✕ WRONG'}
                          </button>
                        </div>
                      </>
                    )}

                    {/* CORRECT RESULT */}
                    {claim.result === 'correct' && (
                      <div className="mt-5 rounded-2xl border-2 border-emerald-400/50 bg-emerald-400/10 p-5">
                        <p className="text-4xl font-black text-emerald-400 sm:text-5xl">
                          ✓ CORRECT!
                        </p>

                        <p className="mt-2 text-xl font-black text-emerald-300">
                          +{currentQuestion.money} MONEY
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Added to {winningTeam?.custom_name ?? 'the team'}.
                        </p>
                      </div>
                    )}

                    {/* WRONG RESULT */}
                    {claim.result === 'wrong' && (
                      <div className="mt-5 rounded-2xl border-2 border-red-400/50 bg-red-400/10 p-5">
                        <p className="text-4xl font-black text-red-400 sm:text-5xl">
                          ✕ WRONG!
                        </p>

                        <p className="mt-2 text-xl font-black text-red-300">
                          -{currentQuestion.money} MONEY
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Deducted from{' '}
                          {winningTeam?.custom_name ?? 'the team'}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NEXT QUESTION */}
              {claim && claim.result !== 'pending' && (
                <button
                  type="button"
                  disabled={movingNext}
                  onClick={() => void nextQuestion()}
                  className="mt-5 w-full rounded-2xl bg-cyan-400 px-6 py-6 text-2xl font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 sm:text-3xl"
                >
                  {movingNext
                    ? 'LOADING...'
                    : currentQuestionNumber >= totalQuestions
                      ? 'FINISH BATTLE'
                      : 'NEXT QUESTION →'}
                </button>
              )}
            </section>

            {/* TEAM SCOREBOARD */}
            <section className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-400">
                    Live Scoreboard
                  </p>

                  <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                    Team Money
                  </h2>
                </div>

                <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-slate-400">
                  {teams.length} / 4 Teams
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {teams.map((team) => {
                  const isWinningTeam = claim?.team_id === team.id;

                  return (
                    <div
                      key={team.id}
                      className={`rounded-2xl border-2 p-4 transition sm:p-5 ${
                        TEAM_COLOR_STYLES[team.color]
                      } ${
                        isWinningTeam
                          ? 'ring-4 ring-cyan-400/70'
                          : ''
                      }`}
                    >
                      {isWinningTeam && (
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                          Answered First
                        </p>
                      )}

                      <h3 className="truncate text-lg font-black sm:text-xl">
                        {team.custom_name}
                      </h3>

                      <p
                        className={`mt-2 text-3xl font-black sm:text-4xl ${
                          team.score < 0 ? 'text-red-400' : ''
                        }`}
                      >
                        {team.score}
                      </p>

                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Money
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-600 bg-slate-900 p-12 text-center">
            <h2 className="text-3xl font-black">
              Preparing the question...
            </h2>

            <p className="mt-4 text-lg text-slate-400">
              Please wait.
            </p>
          </section>
        )}
      </main>
    );
  }

  if (game?.status === 'finished') {
    const sortedTeams = [...teams].sort(
      (a, b) => b.score - a.score
    );

    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
        <header className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
            Monther&apos;s Class Battle
          </p>

          <h1 className="mt-3 text-5xl font-black">
            Battle Finished!
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            Final Team Money
          </p>
        </header>

        <section className="mt-10 grid gap-5">
          {sortedTeams.map((team, index) => (
            <div
              key={team.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 p-6 ${TEAM_COLOR_STYLES[team.color]}`}
            >
              <div className="flex items-center gap-5">
                <span className="text-3xl font-black">
                  #{index + 1}
                </span>

                <div>
                  <h2 className="text-2xl font-black">
                    {team.custom_name}
                  </h2>

                  <p className="mt-1 text-sm opacity-80">
                    {team.color}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-4xl font-black">
                  {team.score}
                </p>

                <p className="text-sm font-bold">
                  Money
                </p>
              </div>
            </div>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
            Teacher control room
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Waiting for teams
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
        <p className="mt-6 rounded-xl bg-red-500/20 p-4 font-bold text-red-200">
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
                Money: {team.score}
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
          <h2 className="font-bold">
            Join this battle
          </h2>

          {joinUrl && (
            <div className="mt-4 rounded-xl bg-white p-3 text-center">
              <QRCode value={joinUrl} />

              <p className="mt-2 break-all text-xs text-slate-700">
                Scan to join
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={
              starting ||
              !teams.length ||
              game?.status !== 'lobby'
            }
            onClick={() => void start()}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {starting ? 'Starting…' : 'Start Battle'}
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            You need at least one team.
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
              Hidden Money

              <input
                type="number"
                min="0"
                required
                value={money}
                onChange={(event) =>
                  setMoney(event.target.value)
                }
                placeholder="500"
                className="mt-2 w-full rounded-xl border border-emerald-500/50 bg-slate-800 p-3 font-black text-emerald-300"
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
              placeholder={`A
B
C
D`}
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
            <h3 className="font-black">
              Your questions
            </h3>

            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-700 bg-slate-800 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    Question {index + 1}
                  </p>

                  <p className="text-sm font-black text-emerald-300">
                    Hidden Money: {question.money}
                  </p>
                </div>

                <p className="mt-2 text-lg font-bold">
                  {question.question_text}
                </p>

                <p className="mt-3 text-sm text-emerald-300">
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
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [value]);

  return src ? (
    <img
      src={src}
      alt="QR code to join this game"
      className="mx-auto h-52 w-52"
    />
  ) : (
    <div className="mx-auto h-52 w-52 animate-pulse bg-slate-200" />
  );
}
