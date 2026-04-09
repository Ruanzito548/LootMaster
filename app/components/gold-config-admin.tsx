"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import {
  defaultGoldConfig,
  getGoldConfigFor,
  goldSelectionModes,
  type GoldConfig,
  type GoldConfigEntry,
} from "../data/gold-config";
import { games, getServersByGameId, type GameServer } from "../data/games";
import { firebaseEnabled } from "../../lib/firebase";
import { saveGoldConfig, subscribeToGoldConfig } from "../../lib/gold-config";

function buildKey(gameId?: string, serverId?: string, faction?: string): string {
  const parts = [];
  if (gameId) parts.push(gameId);
  if (serverId) parts.push(serverId);
  if (faction) parts.push(faction);
  return parts.join("|");
}

export function GoldConfigAdmin() {
  const [storedConfig, setStoredConfig] = useState(defaultGoldConfig);
  const [draftConfig, setDraftConfig] = useState<GoldConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeConfig = draftConfig ?? storedConfig;

  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedFaction, setSelectedFaction] = useState<string>("");

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const servers = selectedGameId ? getServersByGameId(selectedGameId) : [];
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const factions = selectedServer?.factions ?? ["Horde", "Alliance"];

  const currentKey = buildKey(selectedGameId, selectedServerId, selectedFaction);
  const currentEntry = getGoldConfigFor(activeConfig, selectedGameId, selectedServerId, selectedFaction);

  const selectionMode =
    goldSelectionModes.find((mode) => mode.id === "game-server-faction") ??
    goldSelectionModes[0];

  useEffect(
    () =>
      subscribeToGoldConfig((config) => {
        startTransition(() => {
          setStoredConfig(config);
        });
      }),
    []
  );

  const updateDraftEntry = (partial: Partial<GoldConfigEntry>) => {
    setSaved(false);
    setErrorMessage(null);
    setDraftConfig((current) => {
      const config = current ?? storedConfig;
      const newEntry = { ...currentEntry, ...partial };
      if (currentKey) {
        return {
          ...config,
          overrides: {
            ...config.overrides,
            [currentKey]: newEntry,
          },
        };
      } else {
        return {
          ...config,
          default: newEntry,
        };
      }
    });
  };

  const saveConfig = async () => {
    try {
      setErrorMessage(null);
      const nextConfig = activeConfig; // already sanitized in lib
      await saveGoldConfig(nextConfig);
      setDraftConfig(null);
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a configuracao do gold."
      );
    }
  };

  const resetConfig = () => {
    setDraftConfig(defaultGoldConfig);
    setSaved(false);
    setErrorMessage(null);
  };

  const resetCurrent = () => {
    setDraftConfig((current) => {
      const config = current ?? storedConfig;
      if (currentKey) {
        const newOverrides = { ...config.overrides };
        delete newOverrides[currentKey];
        return {
          ...config,
          overrides: newOverrides,
        };
      } else {
        return {
          ...config,
          default: defaultGoldConfig.default,
        };
      }
    });
    setSaved(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_45%,#070b14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Gold settings
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-400">
            Ajuste o valor do gold, a quantidade minima comprada e configure por jogo, servidor e faccao.
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

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[2rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)]">
            <div className="grid gap-6">
              <div>
                <label
                  htmlFor="game-select"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Jogo
                </label>
                <select
                  id="game-select"
                  value={selectedGameId}
                  onChange={(event) => {
                    setSelectedGameId(event.target.value);
                    setSelectedServerId("");
                    setSelectedFaction("");
                  }}
                  className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
                >
                  <option value="" className="bg-slate-950">
                    Default (todos os jogos)
                  </option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id} className="bg-slate-950">
                      {game.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="server-select"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Servidor
                </label>
                <select
                  id="server-select"
                  value={selectedServerId}
                  disabled={!selectedGameId}
                  onChange={(event) => {
                    setSelectedServerId(event.target.value);
                    setSelectedFaction("");
                  }}
                  className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-slate-950">
                    Default (todos os servidores)
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id} className="bg-slate-950">
                      {server.name} ({server.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="faction-select"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Faccao
                </label>
                <select
                  id="faction-select"
                  value={selectedFaction}
                  disabled={!selectedServerId}
                  onChange={(event) => setSelectedFaction(event.target.value)}
                  className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-slate-950">
                    Default (todas as faccoes)
                  </option>
                  {factions.map((faction) => (
                    <option key={faction} value={faction} className="bg-slate-950">
                      {faction}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="price-per-thousand"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Valor por 1.000 gold
                </label>
                <input
                  id="price-per-thousand"
                  type="number"
                  min="1"
                  step="1"
                  value={currentEntry.pricePerThousand}
                  onChange={(event) =>
                    updateDraftEntry({
                      pricePerThousand: Number(event.target.value),
                    })
                  }
                  className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Exemplo: `20` para cobrar $20 a cada 1.000 gold.
                </p>
              </div>

              <div>
                <label
                  htmlFor="min-gold"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Quantidade minima comprada
                </label>
                <input
                  id="min-gold"
                  type="number"
                  min="1000"
                  step="1000"
                  value={currentEntry.minGold}
                  onChange={(event) =>
                    updateDraftEntry({
                      minGold: Number(event.target.value),
                    })
                  }
                  className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
                />
                <p className="mt-2 text-sm text-slate-500">
                  O slider de compra respeita blocos de 1.000.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-300">
                Configuracao atual pronta para o menu de gold.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetCurrent}
                  className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Reset atual
                </button>
                <button
                  type="button"
                  onClick={resetConfig}
                  className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Reset tudo
                </button>
                <button
                  type="button"
                  onClick={() => void saveConfig()}
                  disabled={!firebaseEnabled}
                  className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  Salvar
                </button>
              </div>
            </div>

            {saved ? (
              <p className="mt-4 text-sm font-semibold text-emerald-700">
                Configuracao do gold salva com sucesso.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <aside className="rounded-[2rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(12,19,36,0.95)_100%)] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)]">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-200">
              Configuracao atual
            </p>
            <h2 className="mt-4 text-3xl font-black">
              {selectedGame?.title ?? "Default"} / {selectedServer?.name ?? "Todos"} / {selectedFaction || "Todas"}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              {selectionMode.description}
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.25rem] border border-white/8 bg-[#0c1324] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Valor do gold
                </p>
                <p className="mt-2 text-3xl font-black">
                  ${currentEntry.pricePerThousand}
                </p>
                <p className="mt-2 text-sm text-slate-400">por 1.000 gold</p>
              </div>

              <div className="rounded-[1.25rem] border border-white/8 bg-[#0c1324] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Compra minima
                </p>
                <p className="mt-2 text-3xl font-black">
                  {currentEntry.minGold.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-slate-400">gold</p>
              </div>
            </div>
          </aside>
        </section>

        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Back to admin
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
