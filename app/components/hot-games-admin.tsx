"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { defaultHotGameIds, games } from "../data/games";
import { saveHotGames, subscribeToHotGames } from "../../lib/hot-games";
import { firebaseEnabled } from "../../lib/firebase";

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
    }
    );
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7ecd2_0%,#f4eee2_32%,#ebe3d2_62%,#e5dac6_100%)] text-zinc-950">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-5">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-900">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Escolha quais jogos entram no bloco de destaque.
          </h1>
          <p className="max-w-3xl text-base leading-8 text-zinc-700">
            Essa pagina controla a area de jogos em tendencia da home usando um
            documento do Firestore. A home e o admin passam a ler a mesma fonte
            de dados.
          </p>
        </div>

        {!firebaseEnabled ? (
          <section className="mt-10 rounded-[2rem] border border-amber-500/30 bg-amber-50 px-6 py-5 text-amber-950">
            <p className="text-sm font-bold uppercase tracking-[0.24em]">
              Firebase pendente
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7">
              Preencha as variaveis de ambiente do arquivo `.env.local` com as
              chaves do seu projeto Firebase. Eu deixei um modelo em
              `.env.example`.
            </p>
          </section>
        ) : null}

        <section className="mt-10 rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-sm">
          <div className="grid gap-4">
            {games.map((game) => {
              const isSelected = activeIds.includes(game.id);

              return (
                <label
                  key={game.id}
                  className={`flex cursor-pointer items-start justify-between gap-4 rounded-[1.5rem] border p-5 transition-colors ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-50"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black">{game.title}</h2>
                      <span className="rounded-full border border-amber-900/15 bg-amber-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-900">
                        {game.tag}
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-zinc-600">
                      {game.description}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleGame(game.id)}
                    className="mt-1 h-5 w-5 accent-zinc-950"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                {activeIds.length} jogo(s) marcados como destaque.
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Clique em salvar para atualizar a home.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetSelection}
                className="rounded-full border border-zinc-950/15 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                Restaurar padrao
              </button>
              <button
                type="button"
                onClick={() => void saveSelection()}
                disabled={!firebaseEnabled}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Salvar destaques
              </button>
            </div>
          </div>

          {saved ? (
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              Destaques salvos com sucesso.
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
            className="inline-flex rounded-full border border-zinc-950/15 bg-white/70 px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
          >
            Voltar para a home
          </Link>
        </div>
      </main>
    </div>
  );
}
