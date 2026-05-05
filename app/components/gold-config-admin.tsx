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

export function GoldConfigAdmin() {
  const [savedConfig, setSavedConfig] = useState<GoldConfig>(emptyGoldConfig);
  const [draftEntry, setDraftEntry] = useState<GoldConfigEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser) && firebaseEnabled);

  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedFaction, setSelectedFaction] = useState<string>("");

  const selectedGame = games.find((g) => g.id === selectedGameId);
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

  const dashboardByGame = games.map((game) => {
    const gameServers = getServersByGameId(game.id);

    if (gameServers.length === 0) {
      const key = buildGoldKey(game.id);
      return {
        gameId: game.id,
        gameTitle: game.title,
        rows: [
          {
            key,
            server: "-",
            faction: "-",
            config: savedConfig[key],
          },
        ],
      };
    }

    return {
      gameId: game.id,
      gameTitle: game.title,
      rows:
        game.id === "retail"
          ? gameServers.map((server) => {
              const key = buildGoldKey(game.id, server.id);
              return {
                key,
                server: server.name,
                faction: "-",
                config: savedConfig[key],
              };
            })
          : gameServers.flatMap((server) =>
              (server.factions.length > 0 ? server.factions : ["-"]).map((faction) => {
                const key = buildGoldKey(game.id, server.id, faction === "-" ? undefined : faction);
                return {
                  key,
                  server: server.name,
                  faction,
                  config: savedConfig[key],
                };
              })
            ),
    };
  });

  const gameDashboardStyle = (gameId: string) => {
    if (gameId === "tbc-anniversary") {
      return {
        backgroundImage:
          'linear-gradient(rgba(8, 18, 10, 0.46), rgba(8, 18, 10, 0.58)), url("/wow/wow-tbc/tbc-logo.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    if (gameId === "retail") {
      return {
        backgroundImage:
          'linear-gradient(rgba(7, 16, 28, 0.46), rgba(7, 16, 28, 0.58)), url("/wow/wow-retail/midinight-logo.jpeg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    if (gameId === "classic-era") {
      return {
        backgroundImage:
          'linear-gradient(rgba(30, 21, 12, 0.46), rgba(30, 21, 12, 0.58)), url("/wow/wow-classic-era/classic-era-logo.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    if (gameId === "mist-of-pandaria") {
      return {
        backgroundImage:
          'linear-gradient(rgba(8, 28, 22, 0.46), rgba(8, 28, 22, 0.58)), url("/wow/wow-pandaria/pandaria-logo.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    return undefined;
  };

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">
            Gold settings
          </h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Configure gold price and minimum amount by game, server, and faction. Each combination is saved separately in Firebase.
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

        <section className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">
            Preview Dashboard
          </p>
          <h2 className="mt-4 text-2xl font-black text-green-300">
            Configuration by game / server / faction
          </h2>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {dashboardByGame.map((gameBlock) => (
              <article
                key={gameBlock.gameId}
                className="rounded-[1.4rem] border border-green-900 bg-green-950/20 p-6"
                style={gameDashboardStyle(gameBlock.gameId)}
              >
                <h3 className="text-xl font-black text-green-300">{gameBlock.gameTitle}</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {gameBlock.rows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-[1rem] border border-green-900 bg-black/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-green-300">
                          {row.faction === "-" ? row.server : `${row.server} / ${row.faction}`}
                        </p>
                        <span className="font-mono text-[10px] text-green-700">
                          {row.key}
                        </span>
                      </div>

                      {row.config ? (
                        <div className="mt-3 grid gap-1 text-sm text-green-400">
                          <p>Price: <span className="font-semibold">${row.config.pricePerThousand}</span></p>
                          <p>Min: <span className="font-semibold">{row.config.minGold.toLocaleString()}</span></p>
                          <p>Max: <span className="font-semibold">{row.config.maxGold.toLocaleString()}</span></p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm font-semibold text-rose-300">Not configured</p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-[2rem] border border-green-900 bg-green-950/20 p-8">
            <div className="grid gap-6">

              {/* Game - required */}
              <div>
                <label htmlFor="game-select" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                  Game
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
                  <option value="">- Select a game -</option>
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
                  {requiresFactionSelection ? "Server" : "Region"}
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
                      ? "No servers registered"
                      : requiresFactionSelection
                      ? "Select a server"
                      : "Select a region"}
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
                  Faction
                </label>
                <select
                  id="faction-select"
                  value={selectedFaction}
                  disabled={!selectedServerId}
                  onChange={(event) => setSelectedFaction(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!selectedServerId ? (
                    <option value="">Select a server first</option>
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
                      Value per 1,000 gold
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
                      className="mt-3 w-full rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    />
                    <p className="mt-2 text-sm text-green-700">
                      Example: 20 to charge $20 per 1,000 gold.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="min-gold" className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                      Minimum purchase amount
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
                      Maximum purchase amount
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
                    ? "Select a game to edit the configuration."
                    : requiresFactionSelection
                    ? "Select a server to edit the configuration."
                    : "Select a region to edit the configuration."
                  }
                </p>
              )}
            </div>

            {scopeReady ? (
              <div className="mt-8 flex flex-col gap-4 border-t border-green-900 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  {currentKey && (
                    <p className="font-mono text-xs text-green-700">
                      key: <span className="text-green-400">{currentKey}</span>
                    </p>
                  )}
                  {hasSavedOverride ? (
                    <p className="text-xs font-semibold text-emerald-500">Own configuration saved in Firebase</p>
                  ) : (
                    <p className="text-xs text-green-700">Using inheritance (no own configuration for this scope)</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {hasSavedOverride && (
                    <button
                      type="button"
                      onClick={() => void resetCurrent()}
                      disabled={saving}
                      className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove config
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveConfig()}
                    disabled={!canSave}
                    className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : null}

            {!isAuthenticated ? (
              <p className="mt-4 text-sm font-semibold text-amber-200">
                Sign in with Google before saving gold settings.
              </p>
            ) : null}

            {saved ? (
              <p className="mt-4 text-sm font-semibold text-emerald-500">
                Configuration saved successfully.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-500">
                {errorMessage}
              </p>
            ) : null}
          </div>

        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/admin" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Back to admin
          </Link>
          <Link href="/" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

