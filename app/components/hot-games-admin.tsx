"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { startTransition, useEffect, useState } from "react";

import { saveHotGames, subscribeToHotGames } from "../../lib/hot-games";
import { auth, firebaseEnabled } from "../../lib/firebase";
import { defaultHotGameIds, games } from "../data/games";

export function HotGamesAdmin() {
  const [storedIds, setStoredIds] = useState<string[]>(defaultHotGameIds);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser) && firebaseEnabled);
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

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

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
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Manage hots</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
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

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="grid gap-4">
            {games.map((game) => {
              const isSelected = activeIds.includes(game.id);

              return (
                <label
                  key={game.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-[1.25rem] border p-5 transition-colors ${
                    isSelected
                      ? "border-[#ffd76a]/24 bg-[#f7ba2c]/10"
                      : "border-[#ffd76a]/10 bg-white/4"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="loot-title text-lg font-black">{game.title}</h2>
                      <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                        {game.tag}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleGame(game.id)}
                    className="h-5 w-5 accent-[#f7ba2c]"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-[#ffd76a]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="loot-muted text-sm font-semibold">
              {activeIds.length} game(s) selected.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetSelection}
                className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => void saveSelection()}
                disabled={!firebaseEnabled || !isAuthenticated}
                className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
              >
                Salvar
              </button>
            </div>
          </div>

          {!isAuthenticated ? (
            <p className="mt-4 text-sm font-semibold text-amber-200">
              Faca login com Google antes de salvar os hots.
            </p>
          ) : null}

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
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
            >
              Back to admin
            </Link>
            <Link
              href="/"
              className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
