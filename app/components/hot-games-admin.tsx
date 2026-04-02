"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import {
  defaultHotGameIds,
  games,
  HOT_GAMES_STORAGE_KEY,
} from "../data/games";

function readHotGames() {
  if (typeof window === "undefined") {
    return defaultHotGameIds;
  }

  const saved = window.localStorage.getItem(HOT_GAMES_STORAGE_KEY);

  if (!saved) {
    return defaultHotGameIds;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return defaultHotGameIds;
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return defaultHotGameIds;
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener("hot-games-updated", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("hot-games-updated", handleChange);
  };
}

export function HotGamesAdmin() {
  const storedIds = useSyncExternalStore(
    subscribe,
    readHotGames,
    () => defaultHotGameIds
  );
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const activeIds = selectedIds ?? storedIds;

  const toggleGame = (gameId: string) => {
    setSaved(false);
    setSelectedIds((current) => {
      const source = current ?? storedIds;

      return source.includes(gameId)
        ? source.filter((id) => id !== gameId)
        : [...source, gameId];
    }
    );
  };

  const saveSelection = () => {
    window.localStorage.setItem(
      HOT_GAMES_STORAGE_KEY,
      JSON.stringify(activeIds)
    );
    window.dispatchEvent(new Event("hot-games-updated"));
    setSelectedIds(null);
    setSaved(true);
  };

  const resetSelection = () => {
    setSelectedIds(defaultHotGameIds);
    setSaved(false);
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
            Essa pagina controla a area de jogos em tendencia da home. A
            selecao fica salva no navegador para voce iterar no layout enquanto
            definimos o restante do funil.
          </p>
        </div>

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
                onClick={saveSelection}
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
