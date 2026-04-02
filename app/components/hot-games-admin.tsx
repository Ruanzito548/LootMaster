"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { saveHotGames, subscribeToHotGames } from "../../lib/hot-games";
import { firebaseEnabled } from "../../lib/firebase";
import { defaultHotGameIds, games } from "../data/games";

export function HotGamesAdmin() {
  const [storedIds, setStoredIds] = useState<string[]>(defaultHotGameIds);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeIds = selectedIds ?? storedIds;

  useEffect(
    () =>
      subscribeToHotGames((ids) => {
        startTransition(() => {
          setStoredIds(ids);
        });
      }),
    []
  );

  const toggleGame = (gameId: string) => {
    setSaved(false);
    setErrorMessage(null);
    setSelectedIds((current) => {
      const source = current ?? storedIds;

      return source.includes(gameId)
        ? source.filter((id) => id !== gameId)
        : [...source, gameId];
    });
  };

  const saveSelection = async () => {
    try {
      setErrorMessage(null);
      await saveHotGames(activeIds);
      setSelectedIds(null);
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar no Firebase."
      );
    }
  };

  const resetSelection = () => {
    setSelectedIds(defaultHotGameIds);
    setSaved(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_45%,#070b14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">Manage hots</h1>
          <p className="max-w-2xl text-base leading-8 text-slate-400">
            Select the games that should appear as highlights.
          </p>
        </div>

        {!firebaseEnabled ? (
          <section className="mt-8 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/8 px-6 py-5 text-amber-100">
            <p className="text-sm font-bold uppercase tracking-[0.24em]">
              Firebase pending
            </p>
            <p className="mt-3 text-sm leading-7">
              Add the project environment variables to enable saving.
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-[2rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)]">
          <div className="grid gap-4">
            {games.map((game) => {
              const isSelected = activeIds.includes(game.id);

              return (
                <label
                  key={game.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-[1.25rem] border p-5 transition-colors ${
                    isSelected
                      ? "border-cyan-300/30 bg-cyan-300/8"
                      : "border-white/8 bg-white/4"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black">{game.title}</h2>
                      <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                        {game.tag}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleGame(game.id)}
                    className="h-5 w-5 accent-cyan-300"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-300">
              {activeIds.length} game(s) selected.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetSelection}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => void saveSelection()}
                disabled={!firebaseEnabled}
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                Salvar
              </button>
            </div>
          </div>

          {saved ? (
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              Highlights saved successfully.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 text-sm font-semibold text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
