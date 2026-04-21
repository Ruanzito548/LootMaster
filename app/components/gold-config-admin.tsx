"use client";

import Link from "next/link";
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
import { firebaseEnabled } from "../../lib/firebase";
import {
  deleteGoldConfigEntry,
  saveGoldConfigEntry,
  subscribeToGoldConfig,
} from "../../lib/gold-config";

export function GoldConfigAdmin() {
  const [savedConfig, setSavedConfig] = useState<GoldConfig>(emptyGoldConfig);
  const [draftEntry, setDraftEntry] = useState<GoldConfigEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedFaction, setSelectedFaction] = useState<string>("");

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const servers = selectedGameId ? getServersByGameId(selectedGameId) : [];
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const factions = selectedServer?.factions ?? ["Horde", "Alliance"];

  useEffect(() => {
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
  }, [selectedServerId, selectedServer]);

  const currentKey = selectedGameId
    ? buildGoldKey(selectedGameId, selectedServerId || undefined, selectedFaction || undefined)
    : "";

  const savedEntry = selectedGameId
    ? getGoldConfigFor(savedConfig, selectedGameId, selectedServerId || undefined, selectedFaction || undefined)
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
        error instanceof Error ? error.message : "Nao foi possivel salvar."
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
        error instanceof Error ? error.message : "Nao foi possivel remover."
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    firebaseEnabled &&
    !saving &&
    selectedGameId !== "" &&
    (selectedServerId === "" || selectedFaction !== "");

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
            Configure o preco e quantidade minima de gold por jogo, servidor e faccao. Cada combinacao e salva separadamente no Firebase.
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

              {/* Jogo — obrigatorio */}
              <div>
                <label htmlFor="game-select" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
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
                  <option value="">— Selecione um jogo —</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Servidor — opcional */}
              <div>
                <label htmlFor="server-select" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Servidor <span className="normal-case text-[#7d8597]">(opcional)</span>
                </label>
                <select
                  id="server-select"
                  value={selectedServerId}
                  disabled={!selectedGameId || servers.length === 0}
                  onChange={(event) => {
                    const nextServerId = event.target.value;
                    const nextServer = servers.find((server) => server.id === nextServerId);
                    setSelectedServerId(nextServerId);
                    setSelectedFaction(nextServer?.factions?.[0] ?? "");
                  }}
                  className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                >
                  <option value="">
                    {servers.length === 0 ? "Nenhum servidor cadastrado" : "Todos os servidores"}
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Faccao — obrigatoria quando houver servidor selecionado */}
              <div>
                <label htmlFor="faction-select" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Faccao
                </label>
                <select
                  id="faction-select"
                  value={selectedFaction}
                  disabled={!selectedServerId}
                  onChange={(event) => setSelectedFaction(event.target.value)}
                  className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
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

              {/* Campos de preco/minimo — so aparecem se jogo foi selecionado */}
              {selectedGameId ? (
                <>
                  <div>
                    <label htmlFor="price-per-thousand" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                      Valor por 1.000 gold
                    </label>
                    <input
                      id="price-per-thousand"
                      type="number"
                      min="1"
                      step="1"
                      value={activeEntry.pricePerThousand}
                      onChange={(event) =>
                        updateDraft({ pricePerThousand: Number(event.target.value) })
                      }
                      className="loot-input mt-3 px-4 py-3 text-sm font-semibold"
                    />
                    <p className="mt-2 text-sm text-[#7d8597]">
                      Exemplo: 20 para cobrar $20 a cada 1.000 gold.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="min-gold" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                      Quantidade minima de compra
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
                      className="loot-input mt-3 px-4 py-3 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="max-gold" className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                      Quantidade maxima de compra
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
                      className="loot-input mt-3 px-4 py-3 text-sm font-semibold"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#7d8597]">Selecione um jogo para editar a configuracao.</p>
              )}
            </div>

            {selectedGameId ? (
              <div className="mt-8 flex flex-col gap-4 border-t border-[#ffd76a]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  {currentKey && (
                    <p className="font-mono text-xs text-[#7d8597]">
                      chave: <span className="text-[#ffd76a]">{currentKey}</span>
                    </p>
                  )}
                  {hasSavedOverride ? (
                    <p className="text-xs font-semibold text-emerald-500">Config propria salva no Firebase</p>
                  ) : (
                    <p className="text-xs text-[#7d8597]">Usando heranca (sem config propria para este escopo)</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {hasSavedOverride && (
                    <button
                      type="button"
                      onClick={() => void resetCurrent()}
                      disabled={saving}
                      className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                    >
                      Remover config
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveConfig()}
                    disabled={!canSave}
                    className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : null}

            {saved ? (
              <p className="mt-4 text-sm font-semibold text-emerald-500">
                Configuracao salva com sucesso.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-500">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <aside className="loot-panel rounded-[2rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Preview
            </p>
            <h2 className="loot-title mt-4 text-2xl font-black">
              {selectedGame?.title ?? "—"} {selectedServer ? `/ ${selectedServer.name}` : ""} {selectedFaction ? `/ ${selectedFaction}` : ""}
            </h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.25rem] border border-[#ffd76a]/10 bg-white/4 p-4">
                <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Valor do gold
                </p>
                <p className="loot-title mt-2 text-3xl font-black">
                  ${activeEntry.pricePerThousand}
                </p>
                <p className="loot-muted mt-1 text-sm">por 1.000 gold</p>
              </div>

              <div className="rounded-[1.25rem] border border-[#ffd76a]/10 bg-white/4 p-4">
                <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                  Minimo / Maximo
                </p>
                <p className="loot-title mt-2 text-3xl font-black">
                  {activeEntry.minGold.toLocaleString()}
                </p>
                <p className="loot-muted mt-1 text-sm">
                  ate {activeEntry.maxGold.toLocaleString()} gold
                </p>
              </div>
            </div>
          </aside>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/admin" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to admin
          </Link>
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
