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

function normalizeGoldAmount(value: number): number {
  return Math.max(1000, Math.ceil(value / 1000) * 1000);
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
    const nextGameId = selectedGameId;
    const nextServerId = selectedServerId;
    const nextFaction = selectedFaction;
    setDraftConfig((current) => {
      const config = current ?? storedConfig;
      const key = buildKey(nextGameId, nextServerId, nextFaction);
      const baseEntry = getGoldConfigFor(config, nextGameId, nextServerId, nextFaction);
      const newEntry = { ...baseEntry, ...partial };
      if (key) {
        return {
          ...config,
          overrides: {
            ...config.overrides,
            [key]: newEntry,
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
    const nextGameId = selectedGameId;
    const nextServerId = selectedServerId;
    const nextFaction = selectedFaction;
    setDraftConfig((current) => {
      const config = current ?? storedConfig;
      const key = buildKey(nextGameId, nextServerId, nextFaction);
      if (key) {
        const newOverrides = { ...config.overrides };
        delete newOverrides[key];
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
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Gold settings
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
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
          <div className="loot-panel rounded-[2rem] p-8">
            <div className="grid gap-6">
              <div>
                <label
                  htmlFor="game-select"
                  className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
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
                  className="loot-select mt-3 px-4 py-3 text-sm font-semibold"
                >
                  <option value="">
                    Default (todos os jogos)
                  </option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="server-select"
                  className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
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
                  className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                >
                  <option value="">
                    Default (todos os servidores)
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="faction-select"
                  className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
                >
                  Faccao
                </label>
                <select
                  id="faction-select"
                  value={selectedFaction}
                  disabled={!selectedServerId}
                  onChange={(event) => setSelectedFaction(event.target.value)}
                  className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                >
                  <option value="">
                    Default (todas as faccoes)
                  </option>
                  {factions.map((faction) => (
                    <option key={faction} value={faction}>
                      {faction}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="price-per-thousand"
                  className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
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
                  className="loot-input mt-3 px-4 py-3 text-sm font-semibold"
                />
                <p className="mt-2 text-sm text-[#7d8597]">
                  Exemplo: `20` para cobrar $20 a cada 1.000 gold.
                </p>
              </div>

              <div>
                <label
                  htmlFor="min-gold"
                  className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
                >
                  Quantidade minima comprada
                </label>
                <input
                  id="min-gold"
                  type="number"
                  min="1000"
                  step="1000"
                  value={currentEntry.minGold}
                  onChange={(event) => {
                    const parsedMinGold = Number(event.target.value);
                    if (!Number.isFinite(parsedMinGold) || parsedMinGold <= 0) {
                      return;
                    }

                    updateDraftEntry({
                      minGold: normalizeGoldAmount(parsedMinGold),
                    });
                  }}
                  className="loot-input mt-3 px-4 py-3 text-sm font-semibold"
                />
                <p className="mt-2 text-sm text-[#7d8597]">
                  O slider de compra respeita blocos de 1.000.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-[#ffd76a]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="loot-muted text-sm font-semibold">
                Configuracao atual pronta para o menu de gold.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetCurrent}
                  className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
                >
                  Reset atual
                </button>
                <button
                  type="button"
                  onClick={resetConfig}
                  className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
                >
                  Reset tudo
                </button>
                <button
                  type="button"
                  onClick={() => void saveConfig()}
                  disabled={!firebaseEnabled}
                  className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
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

          <aside className="loot-panel rounded-[2rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Configuracao atual
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">
              {selectedGame?.title ?? "Default"} / {selectedServer?.name ?? "Todos"} / {selectedFaction || "Todas"}
            </h2>
            <p className="loot-muted mt-4 text-base leading-8">
              {selectionMode.description}
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.25rem] border border-[#ffd76a]/10 bg-white/4 p-4">
                <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Valor do gold
                </p>
                <p className="loot-title mt-2 text-3xl font-black">
                  ${currentEntry.pricePerThousand}
                </p>
                <p className="loot-muted mt-2 text-sm">por 1.000 gold</p>
              </div>

              <div className="rounded-[1.25rem] border border-[#ffd76a]/10 bg-white/4 p-4">
                <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Compra minima
                </p>
                <p className="loot-title mt-2 text-3xl font-black">
                  {currentEntry.minGold.toLocaleString()}
                </p>
                <p className="loot-muted mt-2 text-sm">gold</p>
              </div>
            </div>
          </aside>
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
