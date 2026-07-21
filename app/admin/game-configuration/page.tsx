"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { games } from "@/app/data/games";
import { AccountsMarketAdmin } from "@/app/components/accounts-market-admin";
import { GoldConfigAdmin } from "@/app/components/gold-config-admin";
import {
  CONFIGURABLE_CATEGORY_IDS,
  CONFIGURABLE_GAME_IDS,
  buildDefaultGameConfiguration,
  sanitizeGameConfiguration,
  type ConfigurableCategoryId,
  type ConfigurableGameId,
  type GameConfiguration,
} from "@/lib/game-configuration";

type ConfigResponse = {
  config?: GameConfiguration;
  error?: string;
};

const categoryLabels: Record<ConfigurableCategoryId, string> = {
  gold: "Gold",
  boost: "Boost",
  accounts: "Accounts",
};

const gameTitleById: Record<ConfigurableGameId, string> = {
  retail: "World of Warcraft Retail (Midnight)",
  "classic-era": "Classic Era",
  "tbc-anniversary": "TBC Anniversary",
  "mist-of-pandaria": "Mist of Pandaria",
};

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-14 items-center rounded-full border transition ${
        checked
          ? "border-emerald-400/50 bg-emerald-500/25"
          : "border-slate-500/50 bg-slate-800/60"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-8" : "translate-x-1"}`}
      />
      <span className="sr-only">Toggle</span>
    </button>
  );
}

export default function AdminGameConfigurationPage() {
  const { user, status } = useProfileSession();
  const [config, setConfig] = useState<GameConfiguration>(buildDefaultGameConfiguration());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/game-configuration", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as ConfigResponse;
        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load game configuration.");
        }

        if (!cancelled) {
          setConfig(sanitizeGameConfiguration(payload.config));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load game configuration.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasAnyDisabled = useMemo(
    () => CONFIGURABLE_GAME_IDS.some((gameId) => !config.byGame[gameId]?.enabled),
    [config],
  );

  const persistConfig = async (nextConfig: GameConfiguration) => {
    if (!user) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/game-configuration", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: nextConfig }),
      });

      const payload = (await response.json()) as ConfigResponse;
      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Could not save game configuration.");
      }

      setConfig(sanitizeGameConfiguration(payload.config));
      setMessage("Configuracao salva automaticamente.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save game configuration.");
    } finally {
      setSaving(false);
    }
  };

  const updateGameToggle = (gameId: ConfigurableGameId, key: "enabled" | ConfigurableCategoryId, value: boolean) => {
    const nextConfig = sanitizeGameConfiguration({
      ...config,
      byGame: {
        ...config.byGame,
        [gameId]: {
          ...config.byGame[gameId],
          [key]: value,
        },
      },
    });

    setConfig(nextConfig);
    void persistConfig(nextConfig);
  };

  return (
    <div className="min-h-screen bg-black text-green-300">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Configurações</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Configurações</h1>
            <p className="mt-2 text-sm text-green-500">Controle central de jogos, baús, preços de gold e market de accounts com refletimento imediato no site.</p>
          </div>
          {hasAnyDisabled ? (
            <span className="rounded-full border border-amber-600/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
              Disabled (Admin Only)
            </span>
          ) : null}
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-green-900 bg-green-950/15 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Games</p>
            <h2 className="mt-1 text-lg font-black text-green-200">Game Configuration</h2>
            <p className="mt-2 text-sm text-green-600">Liga/desliga jogos e categorias do marketplace.</p>
            <Link href="#game-configuration" className="mt-4 inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950">
              Abrir
            </Link>
          </article>

          <article className="rounded-2xl border border-green-900 bg-green-950/15 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Gold</p>
            <h2 className="mt-1 text-lg font-black text-green-200">Preço de Gold</h2>
            <p className="mt-2 text-sm text-green-600">Editar preço por mil gold, mínimo e escopo por jogo/servidor/facção.</p>
            <Link href="/admin/games/wow/gold-settings" className="mt-4 inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950">
              Abrir editor
            </Link>
          </article>

          <article className="rounded-2xl border border-green-900 bg-green-950/15 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Accounts</p>
            <h2 className="mt-1 text-lg font-black text-green-200">Marketplace de Accounts</h2>
            <p className="mt-2 text-sm text-green-600">Cadastrar e gerenciar contas do market.</p>
            <Link href="/admin/games/wow/accounts" className="mt-4 inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950">
              Abrir editor
            </Link>
          </article>

          <article className="rounded-2xl border border-green-900 bg-green-950/15 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Chests</p>
            <h2 className="mt-1 text-lg font-black text-green-200">Config dos Baus</h2>
            <p className="mt-2 text-sm text-green-600">Balanco e chances em tempo real.</p>
            <Link href="/admin/chests" className="mt-4 inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950">
              Abrir editor
            </Link>
          </article>
        </section>

        <section className="mt-6 space-y-3">
          <details className="group rounded-2xl border border-green-900 bg-green-950/15">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Gold</p>
                <h2 className="mt-1 text-lg font-black text-green-200">Preço de Gold</h2>
              </div>
              <span className="text-xs text-green-600 transition group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-green-900/60 p-4">
              <GoldConfigAdmin embedded />
            </div>
          </details>

          <details className="group rounded-2xl border border-green-900 bg-green-950/15">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">Accounts</p>
                <h2 className="mt-1 text-lg font-black text-green-200">Marketplace de Accounts</h2>
              </div>
              <span className="text-xs text-green-600 transition group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-green-900/60 p-4">
              <AccountsMarketAdmin embedded />
            </div>
          </details>
        </section>

        {loading || status === "loading" ? (
          <section className="mt-6 rounded-2xl border border-green-900 bg-green-950/20 p-4 text-sm text-green-500">Carregando configuracao...</section>
        ) : (
          <section id="game-configuration" className="mt-6 space-y-3">
            {CONFIGURABLE_GAME_IDS.map((gameId) => {
              const gameConfig = config.byGame[gameId];
              const gameTitle = gameTitleById[gameId] ?? games.find((game) => game.id === gameId)?.title ?? gameId;
              const isDisabled = !gameConfig.enabled;

              return (
                <details key={gameId} className="group rounded-2xl border border-green-900 bg-green-950/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-green-200">{gameTitle}</span>
                      {isDisabled ? (
                        <span className="rounded-full border border-amber-600/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                          Disabled (Admin Only)
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-green-600 transition group-open:rotate-180">▼</span>
                  </summary>

                  <div className="border-t border-green-900/60 px-4 py-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-green-900/70 bg-black/35 px-3 py-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-green-500">Status do jogo</p>
                        <p className="mt-1 text-sm font-semibold text-green-200">Game Enabled</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-500">{gameConfig.enabled ? "ON" : "OFF"}</span>
                        <ToggleSwitch
                          checked={gameConfig.enabled}
                          disabled={saving}
                          onChange={(checked) => updateGameToggle(gameId, "enabled", checked)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {CONFIGURABLE_CATEGORY_IDS.map((categoryId) => {
                        const checked = gameConfig[categoryId];

                        return (
                          <div key={`${gameId}-${categoryId}`} className="rounded-xl border border-green-900/70 bg-black/35 px-3 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-green-500">{categoryLabels[categoryId]}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-green-400">{checked ? "ON" : "OFF"}</span>
                              <ToggleSwitch
                                checked={checked}
                                disabled={saving}
                                onChange={(next) => updateGameToggle(gameId, categoryId, next)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            })}
          </section>
        )}

        {errorMessage ? (
          <section className="mt-5 rounded-xl border border-green-900 bg-black/35 px-4 py-3 text-sm">
            <p className="text-rose-300">{errorMessage}</p>
          </section>
        ) : null}

        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>

        {message ? (
          <div className="fixed right-4 top-24 z-[120] rounded-xl border border-emerald-500/35 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)]">
            {message}
          </div>
        ) : null}
      </main>
    </div>
  );
}
