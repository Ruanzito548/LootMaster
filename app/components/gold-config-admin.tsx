"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { startTransition, useEffect, useState } from "react";

import {
  buildGoldKey,
  defaultGoldConfigEntry,
  emptyGoldConfig,
  getGoldConfigFor,
  type GoldConfig,
  type GoldConfigEntry,
} from "../data/gold-config";
import { games, getServersByGameId } from "../data/games";
import { auth, firebaseEnabled } from "../../lib/firebase";
import {
  deleteGoldConfigEntry,
  saveGoldConfigEntry,
  subscribeToGoldConfig,
} from "../../lib/gold-config";

type GoldConfigAdminProps = {
  embedded?: boolean;
};

export function GoldConfigAdmin({ embedded = false }: GoldConfigAdminProps) {
  const [savedConfig, setSavedConfig] = useState<GoldConfig>(emptyGoldConfig);
  const [draftEntry, setDraftEntry] = useState<GoldConfigEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser) && firebaseEnabled);

  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedFaction, setSelectedFaction] = useState<string>("");

  const servers = selectedGameId ? getServersByGameId(selectedGameId) : [];
  const requiresServerSelection = servers.length > 0;
  const requiresFactionSelection = requiresServerSelection && selectedGameId !== "retail";
  const scopeReady = selectedGameId !== "" && (!requiresServerSelection || selectedServerId !== "");
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const factions = requiresFactionSelection
    ? selectedServer?.factions ?? ["Horde", "Alliance"]
    : [];

  useEffect(() => {
    if (!requiresFactionSelection) {
      setSelectedFaction("");
      return;
    }

    if (!selectedServerId) {
      setSelectedFaction("");
      return;
    }

    const availableFactions = selectedServer?.factions ?? [];
    if (availableFactions.length === 0) {
      setSelectedFaction("");
      return;
    }

    setSelectedFaction((current) =>
      current && availableFactions.includes(current)
        ? current
        : availableFactions[0]
    );
  }, [requiresFactionSelection, selectedServerId, selectedServer]);

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  const currentKey = selectedGameId
    ? buildGoldKey(
        selectedGameId,
        selectedServerId || undefined,
        requiresFactionSelection ? selectedFaction || undefined : undefined,
      )
    : "";

  const savedEntry = selectedGameId
    ? getGoldConfigFor(
        savedConfig,
        selectedGameId,
        selectedServerId || undefined,
        requiresFactionSelection ? selectedFaction || undefined : undefined,
      )
    : defaultGoldConfigEntry;

  const activeEntry = draftEntry ?? savedEntry;

  // indica se o escopo atual tem doc proprio salvo no Firebase
  const hasSavedOverride = currentKey !== "" && !!savedConfig[currentKey];

  useEffect(() => {
    setDraftEntry(null);
    setSaved(false);
    setErrorMessage(null);
  }, [selectedGameId, selectedServerId, selectedFaction]);

  useEffect(
    () =>
      subscribeToGoldConfig((config) => {
        startTransition(() => setSavedConfig(config));
      }),
    []
  );

  const updateDraft = (partial: Partial<GoldConfigEntry>) => {
    setSaved(false);
    setErrorMessage(null);
    setDraftEntry((prev) => ({ ...(prev ?? savedEntry), ...partial }));
  };

  const saveConfig = async () => {
    if (!currentKey) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveGoldConfigEntry(currentKey, activeEntry);
      setDraftEntry(null);
      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save."
      );
    } finally {
      setSaving(false);
    }
  };

  const resetCurrent = async () => {
    if (!currentKey) return;
    setSaving(true);
    setErrorMessage(null);
    setSaved(false);
    try {
      await deleteGoldConfigEntry(currentKey);
      setDraftEntry(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not remove."
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    firebaseEnabled &&
    isAuthenticated &&
    !saving &&
    scopeReady &&
    (!requiresFactionSelection || selectedFaction !== "");

  const scopeTitle = selectedGameId
    ? [
        games.find((game) => game.id === selectedGameId)?.title ?? selectedGameId,
        requiresServerSelection && selectedServer ? selectedServer.name : null,
        requiresFactionSelection && selectedFaction ? selectedFaction : null,
      ]
        .filter(Boolean)
        .join(" • ")
    : "Selecione um jogo";

  const scopeStatusLabel = hasSavedOverride ? "Configuração própria" : "Usando padrão";
  const formatUsd = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className={embedded ? "text-green-400" : "min-h-screen bg-black text-green-400"}>
      <main className={embedded ? "flex w-full flex-1 flex-col" : "mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8"}>
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">
            Configuração de Gold
          </h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Defina preço, valor mínimo e máximo para cada jogo, servidor e facção sem misturar regras.
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

        <section className="mt-8 rounded-[1.5rem] border border-green-900 bg-green-950/20 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">
                Escopo atual
              </p>
              <h2 className="mt-2 text-xl font-black text-green-300">{scopeTitle}</h2>
              <p className="mt-2 text-sm text-green-600">
                Preço: <span className="font-semibold text-green-200">{formatUsd(activeEntry.pricePerThousand)}</span> por 1.000 gold · mínimo {activeEntry.minGold.toLocaleString()} · máximo {activeEntry.maxGold.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-green-900/70 bg-black/35 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-green-200">{scopeStatusLabel}</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-[2rem] border border-green-900 bg-green-950/20 p-8">
            <div className="grid gap-6">

              {/* Game - required */}
              <div>
                <label htmlFor="game-select" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
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
                  className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                >
                  <option value="">- Selecione um jogo -</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Server */}
              <div>
                <label htmlFor="server-select" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                  {requiresFactionSelection ? "Servidor" : "Região"}
                </label>
                <select
                  id="server-select"
                  value={selectedServerId}
                  disabled={!selectedGameId || servers.length === 0}
                  onChange={(event) => {
                    setSelectedServerId(event.target.value);
                    setSelectedFaction("");
                  }}
                  className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="">
                    {servers.length === 0
                      ? "Nenhum servidor cadastrado"
                      : requiresFactionSelection
                      ? "Selecione um servidor"
                      : "Selecione uma região"}
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Faction - required only for games that use server + faction scopes */}
              {requiresFactionSelection ? (
              <div>
                <label htmlFor="faction-select" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                  Facção
                </label>
                <select
                  id="faction-select"
                  value={selectedFaction}
                  disabled={!selectedServerId}
                  onChange={(event) => setSelectedFaction(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!selectedServerId ? (
                    <option value="">Selecione um servidor primeiro</option>
                  ) : null}
                  {factions.map((faction) => (
                    <option key={faction} value={faction}>
                      {faction}
                    </option>
                  ))}
                </select>
              </div>
              ) : null}

              {/* Price/minimum fields - shown only when scope is ready */}
              {scopeReady ? (
                <>
                  <div>
                    <label htmlFor="price-per-thousand" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                      Preço por 1.000 gold (USD)
                    </label>
                    <div className="mt-3 flex items-center rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus-within:border-green-600">
                      <span className="mr-2 text-green-400">$</span>
                      <input
                        id="price-per-thousand"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={activeEntry.pricePerThousand}
                        onChange={(event) =>
                          updateDraft({ pricePerThousand: Number(event.target.value) })
                        }
                        className="w-full bg-transparent outline-none"
                      />
                    </div>
                    <p className="mt-2 text-sm text-green-700">
                      Ex.: 20 para cobrar $20 por 1.000 gold.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="min-gold" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                      Valor mínimo
                    </label>
                    <input
                      id="min-gold"
                      type="number"
                      min="1"
                      step="1"
                      value={activeEntry.minGold}
                      onChange={(event) =>
                        updateDraft({ minGold: Number(event.target.value) })
                      }
                      className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="max-gold" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                      Valor máximo
                    </label>
                    <input
                      id="max-gold"
                      type="number"
                      min="1"
                      step="1"
                      value={activeEntry.maxGold}
                      onChange={(event) =>
                        updateDraft({ maxGold: Number(event.target.value) })
                      }
                      className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-green-700">
                  {selectedGameId === ""
                    ? "Selecione um jogo para editar a configuração."
                    : requiresFactionSelection
                    ? "Selecione um servidor para editar a configuração."
                    : "Selecione uma região para editar a configuração."
                  }
                </p>
              )}
            </div>

            {scopeReady ? (
              <div className="mt-8 flex flex-col gap-4 border-t border-green-900 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${hasSavedOverride ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-green-800/70 bg-black/30 text-green-500"}`}>
                    {scopeStatusLabel}
                  </span>
                  {currentKey ? (
                    <span className="font-mono text-[11px] text-green-700">{currentKey}</span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {hasSavedOverride && (
                    <button
                      type="button"
                      onClick={() => void resetCurrent()}
                      disabled={saving}
                      className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveConfig()}
                    disabled={!canSave}
                    className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : null}

            {!isAuthenticated ? (
              <p className="mt-4 text-sm font-semibold text-amber-200">
                Entre com o Google antes de salvar as configurações.
              </p>
            ) : null}

            {saved ? (
              <p className="mt-4 text-sm font-semibold text-emerald-500">
                Configuração salva com sucesso.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-500">
                {errorMessage}
              </p>
            ) : null}
          </div>

        </section>

        {embedded ? null : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
              Back to admin
            </Link>
            <Link href="/" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

