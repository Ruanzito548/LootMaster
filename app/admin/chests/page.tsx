"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_IDS, type ChestId } from "@/lib/chests";
import { buildDefaultChestWalletEconomyConfig } from "@/lib/chest-wallet-economy";

type RewardOdd = {
  type: string;
  weight: number;
};

type ChestProfileConfig = {
  rewardOdds: RewardOdd[];
  coinRange: { min: number; max: number };
  itemRarityWeights: Array<{ rarity: string; weight: number }>;
  xpGain: number;
  giftCardFragment: { chancePercent: number; min: number; max: number };
  fullGiftCard: { chancePercent: number; min: number; max: number };
  accountDrop: { enabled: boolean; chancePercent: number };
};

type ChestConfigPayload = {
  schemaVersion: number;
  updatedAtMs: number;
  byChest: Record<ChestId, ChestProfileConfig>;
  walletEconomy?: {
    schemaVersion: number;
    updatedAtMs: number;
    useUsdAsBaseCurrency: boolean;
    jackpotCommonChancePercent: number;
    jackpotRareChancePercent: number;
    wallets: Record<string, { allocationPercent: number; rewardProbabilityPercent: number; rewardPercentages: number[]; safetyBufferPercent: number }>;
  };
  walletEconomyState?: {
    wallets: Record<string, { balanceUsd: number; totalReceivedUsd: number; totalDistributedUsd: number; rewardCount: number; lastMovementAtMs: number }>;
    ledger: Array<Record<string, unknown>>;
    updatedAtMs: number;
  };
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRelativeTime(value?: number): string {
  if (!value) {
    return "sem atualização";
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - value) / 60000));
  if (diffMinutes < 1) {
    return "agora mesmo";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} d`;
}

export default function AdminChestConfigPage() {
  const { user, status } = useProfileSession();

  const [rawJson, setRawJson] = useState("");
  const [walletInputs, setWalletInputs] = useState({
    jackpotCommonChancePercent: "5",
    jackpotRareChancePercent: "1",
    normalAllocationPercent: "70",
    jackpotCommonAllocationPercent: "25",
    jackpotRareAllocationPercent: "5",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedSummary = useMemo(() => {
    if (!rawJson.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawJson) as ChestConfigPayload;
      return parsed;
    } catch {
      return null;
    }
  }, [rawJson]);

  const policySnapshot = useMemo(() => {
    const state = parsedSummary?.walletEconomyState;
    const walletBalances = Object.values(state?.wallets ?? {}).reduce((sum, wallet) => sum + (wallet?.balanceUsd ?? 0), 0);
    const totalReceived = Object.values(state?.wallets ?? {}).reduce((sum, wallet) => sum + (wallet?.totalReceivedUsd ?? 0), 0);
    const balanceCoveragePercent = totalReceived > 0 ? (walletBalances / totalReceived) * 100 : 0;
    const jackpotChancePercent = Number(walletInputs.jackpotCommonChancePercent) + Number(walletInputs.jackpotRareChancePercent);

    return {
      totalWalletBalanceUsd: walletBalances,
      balanceCoveragePercent,
      jackpotChancePercent,
    };
  }, [parsedSummary, walletInputs]);

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
        const response = await fetch("/api/admin/rewards/chests-config", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as { config?: ChestConfigPayload; error?: string };

        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load chest config.");
        }

        if (!cancelled) {
          const config = payload.config;
          setRawJson(formatJson(config));
          setWalletInputs({
            jackpotCommonChancePercent: String(config.walletEconomy?.jackpotCommonChancePercent ?? 5),
            jackpotRareChancePercent: String(config.walletEconomy?.jackpotRareChancePercent ?? 1),
            normalAllocationPercent: String(config.walletEconomy?.wallets?.normal?.allocationPercent ?? 70),
            jackpotCommonAllocationPercent: String(config.walletEconomy?.wallets?.jackpotCommon?.allocationPercent ?? 25),
            jackpotRareAllocationPercent: String(config.walletEconomy?.wallets?.jackpotRare?.allocationPercent ?? 5),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load chest config.");
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

  const saveConfig = async (nextWalletEconomy?: { [key: string]: number | string }) => {
    if (!user || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = JSON.parse(rawJson);
      const token = await user.getIdToken();
      const resolvedWalletEconomy = nextWalletEconomy ?? {
        schemaVersion: 1,
        updatedAtMs: Date.now(),
        useUsdAsBaseCurrency: true,
        jackpotCommonChancePercent: Number(walletInputs.jackpotCommonChancePercent),
        jackpotRareChancePercent: Number(walletInputs.jackpotRareChancePercent),
        wallets: {
          normal: {
            allocationPercent: Number(walletInputs.normalAllocationPercent),
            rewardProbabilityPercent: 100,
            rewardPercentages: [5],
            safetyBufferPercent: 0,
          },
          jackpotCommon: {
            allocationPercent: Number(walletInputs.jackpotCommonAllocationPercent),
            rewardProbabilityPercent: 10,
            rewardPercentages: [5, 10, 20],
            safetyBufferPercent: 10,
          },
          jackpotRare: {
            allocationPercent: Number(walletInputs.jackpotRareAllocationPercent),
            rewardProbabilityPercent: 2,
            rewardPercentages: [25, 50, 100],
            safetyBufferPercent: 20,
          },
        },
      };

      const response = await fetch("/api/admin/rewards/chests-config", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: { ...parsed, walletEconomy: resolvedWalletEconomy } }),
      });

      const payload = (await response.json()) as { config?: ChestConfigPayload; error?: string };
      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Could not save chest config.");
      }

      setRawJson(formatJson(payload.config));
      setSuccessMessage("Chest configuration updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid JSON or save failure.");
    } finally {
      setSaving(false);
    }
  };

  const applyRecommendation = () => {
    const defaultConfig = buildDefaultChestWalletEconomyConfig();
    setWalletInputs({
      jackpotCommonChancePercent: String(defaultConfig.jackpotCommonChancePercent),
      jackpotRareChancePercent: String(defaultConfig.jackpotRareChancePercent),
      normalAllocationPercent: String(defaultConfig.wallets.normal.allocationPercent),
      jackpotCommonAllocationPercent: String(defaultConfig.wallets.jackpotCommon.allocationPercent),
      jackpotRareAllocationPercent: String(defaultConfig.wallets.jackpotRare.allocationPercent),
    });
    void saveConfig({
      schemaVersion: 1,
      updatedAtMs: Date.now(),
      useUsdAsBaseCurrency: true,
      jackpotCommonChancePercent: defaultConfig.jackpotCommonChancePercent,
      jackpotRareChancePercent: defaultConfig.jackpotRareChancePercent,
      wallets: {
        normal: {
          allocationPercent: defaultConfig.wallets.normal.allocationPercent,
          rewardProbabilityPercent: defaultConfig.wallets.normal.rewardProbabilityPercent,
          rewardPercentages: defaultConfig.wallets.normal.rewardPercentages,
          safetyBufferPercent: defaultConfig.wallets.normal.safetyBufferPercent,
        },
        jackpotCommon: {
          allocationPercent: defaultConfig.wallets.jackpotCommon.allocationPercent,
          rewardProbabilityPercent: defaultConfig.wallets.jackpotCommon.rewardProbabilityPercent,
          rewardPercentages: defaultConfig.wallets.jackpotCommon.rewardPercentages,
          safetyBufferPercent: defaultConfig.wallets.jackpotCommon.safetyBufferPercent,
        },
        jackpotRare: {
          allocationPercent: defaultConfig.wallets.jackpotRare.allocationPercent,
          rewardProbabilityPercent: defaultConfig.wallets.jackpotRare.rewardProbabilityPercent,
          rewardPercentages: defaultConfig.wallets.jackpotRare.rewardPercentages,
          safetyBufferPercent: defaultConfig.wallets.jackpotRare.safetyBufferPercent,
        },
      },
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black text-green-300">
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-green-900/30" />
          <div className="mt-4 h-96 w-full animate-pulse rounded-2xl bg-green-900/20" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-300">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Admin / Rewards</p>
          <h1 className="text-4xl font-black leading-tight text-green-200 sm:text-5xl">Chest Reward Config</h1>
          <p className="max-w-3xl text-sm leading-7 text-green-600">
            Edit reward balancing, Gift Card Fragment rates, and legendary account drops in one JSON configuration.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {CHEST_IDS.map((chestId) => {
              const profile = parsedSummary?.byChest?.[chestId];
              const totalWeight = profile ? profile.rewardOdds.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0) : 0;

              return (
                <article key={chestId} className="rounded-2xl border border-green-900 bg-black/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">{chestId}</p>
                  <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-green-600">Weight total: {totalWeight}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { key: "jackpotCommonChancePercent", label: "Chance jackpot comum (%)", hint: "Chance de o loot ativar o jackpot comum" },
              { key: "jackpotRareChancePercent", label: "Chance jackpot raro (%)", hint: "Chance de o loot ativar o jackpot raro" },
              { key: "normalAllocationPercent", label: "Alocação carteira normal (%)", hint: "Percentual do cashback destinado às recompensas comuns" },
              { key: "jackpotCommonAllocationPercent", label: "Alocação carteira jackpot comum (%)", hint: "Percentual do cashback para a carteira de jackpots comuns" },
            ].map((field) => (
              <label key={field.key} className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
                {field.label}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={walletInputs[field.key as keyof typeof walletInputs]}
                  onChange={(event) => setWalletInputs((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
                />
                <span className="text-[11px] font-medium normal-case tracking-normal text-green-700">{field.hint}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
              Alocação carteira jackpot raro (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={walletInputs.jackpotRareAllocationPercent}
                onChange={(event) => setWalletInputs((current) => ({ ...current, jackpotRareAllocationPercent: event.target.value }))}
                className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
              />
              <span className="text-[11px] font-medium normal-case tracking-normal text-green-700">Percentual do cashback destinado à carteira de jackpots raros</span>
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
              Alocação carteira jackpot comum (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={walletInputs.jackpotCommonAllocationPercent}
                onChange={(event) => setWalletInputs((current) => ({ ...current, jackpotCommonAllocationPercent: event.target.value }))}
                className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
              />
              <span className="text-[11px] font-medium normal-case tracking-normal text-green-700">Percentual do cashback destinado à carteira de jackpots comuns</span>
            </label>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">Resumo operacional</p>
              <h2 className="mt-1 text-xl font-black text-green-200">Política atual dos baús</h2>
            </div>
            <div className="rounded-full border border-green-800 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-500">
              {parsedSummary?.walletEconomyState?.updatedAtMs ? `Atualizado ${formatRelativeTime(parsedSummary.walletEconomyState.updatedAtMs)}` : "Sem atualização"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Reserva normal</p>
              <p className="mt-2 text-2xl font-black text-green-200">{Number(walletInputs.normalAllocationPercent).toFixed(2)}%</p>
              <p className="mt-1 text-xs text-green-700">Percentual do cashback que alimenta recompensas comuns</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot 20x</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{Number(walletInputs.jackpotCommonAllocationPercent).toFixed(2)}%</p>
              <p className="mt-1 text-xs text-green-700">Alocação do cashback para o fundo jackpot 20x</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot 200x</p>
              <p className="mt-2 text-2xl font-black text-fuchsia-300">{Number(walletInputs.jackpotRareAllocationPercent).toFixed(2)}%</p>
              <p className="mt-1 text-xs text-green-700">Alocação do cashback para o fundo jackpot 200x</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Chance total de jackpots</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{policySnapshot.jackpotChancePercent.toFixed(2)}%</p>
              <p className="mt-1 text-xs text-green-700">Soma das chances de ativação dos jackpots</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Cobertura atual dos pools</p>
              <p className="mt-2 text-xl font-black text-green-200">{policySnapshot.balanceCoveragePercent.toFixed(1)}%</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Fundo vivo total</p>
              <p className="mt-2 text-xl font-black text-green-200">{formatUsd(policySnapshot.totalWalletBalanceUsd)} USD</p>
            </article>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">Resumo da economia</p>
              <h2 className="mt-1 text-xl font-black text-green-200">Carteiras de cashback e jackpots</h2>
            </div>
            <div className="rounded-full border border-green-800 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-500">
              Saldo persistido
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Carteira normal</p>
              <p className="mt-2 text-2xl font-black text-green-200">{formatUsd(parsedSummary?.walletEconomyState?.wallets?.normal?.balanceUsd ?? 0)} USD</p>
              <p className="mt-1 text-xs text-green-700">Saldo disponível para recompensas comuns</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot comum</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{formatUsd(parsedSummary?.walletEconomyState?.wallets?.jackpotCommon?.balanceUsd ?? 0)} USD</p>
              <p className="mt-1 text-xs text-green-700">Saldo acumulado para jackpots comuns</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot raro</p>
              <p className="mt-2 text-2xl font-black text-fuchsia-300">{formatUsd(parsedSummary?.walletEconomyState?.wallets?.jackpotRare?.balanceUsd ?? 0)} USD</p>
              <p className="mt-1 text-xs text-green-700">Saldo acumulado para jackpots raros</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Total distribuído</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{formatUsd(Object.values(parsedSummary?.walletEconomyState?.wallets ?? {}).reduce((sum, wallet) => sum + (wallet?.totalDistributedUsd ?? 0), 0))} USD</p>
              <p className="mt-1 text-xs text-green-700">Valor já pago em recompensas e jackpots</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Cobertura atual</p>
              <p className="mt-2 text-xl font-black text-green-200">{policySnapshot.balanceCoveragePercent.toFixed(1)}%</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Chance total de jackpots</p>
              <p className="mt-2 text-xl font-black text-green-200">{policySnapshot.jackpotChancePercent.toFixed(2)}%</p>
            </article>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
            Chest Config JSON
            <textarea
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              className="min-h-[480px] w-full rounded-2xl border border-green-900 bg-black/70 p-4 font-mono text-xs text-green-200 outline-none focus:border-green-600"
              spellCheck={false}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={!user || saving}
              className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save config"}
            </button>

            <button
              type="button"
              onClick={applyRecommendation}
              disabled={!user || saving}
              className="rounded-md border border-emerald-600 bg-emerald-950 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Applying..." : "Aplicar recomendação"}
            </button>

            <button
              type="button"
              onClick={() => setRawJson(formatJson(parsedSummary))}
              disabled={!parsedSummary}
              className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Format JSON
            </button>

            <Link
              href="/admin"
              className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
            >
              Back to admin
            </Link>
          </div>

          {successMessage ? <p className="mt-3 text-sm font-semibold text-emerald-400">{successMessage}</p> : null}
          {errorMessage ? <p className="mt-3 text-sm font-semibold text-rose-400">{errorMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
