"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_IDS, type ChestId } from "@/lib/chests";

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
  economy?: {
    normalRewardPercent: number;
    jackpot20xPercent: number;
    jackpot200xPercent: number;
    jackpot20xChancePercent: number;
    jackpot200xChancePercent: number;
    jackpot20xMultiplier: number;
    jackpot200xMultiplier: number;
  };
  economyState?: {
    normalBalanceCents: number;
    jackpot20xBalanceCents: number;
    jackpot200xBalanceCents: number;
    totalFundedCents: number;
    totalDistributedCents: number;
    totalJackpotAwardsCents: number;
    updatedAtMs: number;
  };
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatLootCoinsFromCents(value: number): string {
  return (value / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdminChestConfigPage() {
  const { user, status } = useProfileSession();

  const [rawJson, setRawJson] = useState("");
  const [economyInputs, setEconomyInputs] = useState({
    normalRewardPercent: "5",
    jackpot20xPercent: "1",
    jackpot200xPercent: "1",
    jackpot20xChancePercent: "2",
    jackpot200xChancePercent: "0.5",
    jackpot20xMultiplier: "20",
    jackpot200xMultiplier: "200",
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
          setEconomyInputs({
            normalRewardPercent: String(config.economy?.normalRewardPercent ?? 5),
            jackpot20xPercent: String(config.economy?.jackpot20xPercent ?? 1),
            jackpot200xPercent: String(config.economy?.jackpot200xPercent ?? 1),
            jackpot20xChancePercent: String(config.economy?.jackpot20xChancePercent ?? 2),
            jackpot200xChancePercent: String(config.economy?.jackpot200xChancePercent ?? 0.5),
            jackpot20xMultiplier: String(config.economy?.jackpot20xMultiplier ?? 20),
            jackpot200xMultiplier: String(config.economy?.jackpot200xMultiplier ?? 200),
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

  const saveConfig = async () => {
    if (!user || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = JSON.parse(rawJson);
      const token = await user.getIdToken();
      const nextEconomy = {
        normalRewardPercent: Number(economyInputs.normalRewardPercent),
        jackpot20xPercent: Number(economyInputs.jackpot20xPercent),
        jackpot200xPercent: Number(economyInputs.jackpot200xPercent),
        jackpot20xChancePercent: Number(economyInputs.jackpot20xChancePercent),
        jackpot200xChancePercent: Number(economyInputs.jackpot200xChancePercent),
        jackpot20xMultiplier: Number(economyInputs.jackpot20xMultiplier),
        jackpot200xMultiplier: Number(economyInputs.jackpot200xMultiplier),
      };

      const response = await fetch("/api/admin/rewards/chests-config", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: { ...parsed, economy: nextEconomy } }),
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
              { key: "normalRewardPercent", label: "Reserva para premiações normais (%)", hint: "Percentual do cashback destinado às recompensas comuns dos baús" },
              { key: "jackpot20xPercent", label: "Reserva jackpot 20x (%)", hint: "Percentual do cashback que alimenta o fundo jackpot 20x" },
              { key: "jackpot200xPercent", label: "Reserva jackpot 200x (%)", hint: "Percentual do cashback que alimenta o fundo jackpot 200x" },
              { key: "jackpot20xChancePercent", label: "Chance jackpot 20x (%)", hint: "Chance de o loot ativar o jackpot 20x" },
            ].map((field) => (
              <label key={field.key} className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
                {field.label}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={economyInputs[field.key as keyof typeof economyInputs]}
                  onChange={(event) => setEconomyInputs((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
                />
                <span className="text-[11px] font-medium normal-case tracking-normal text-green-700">{field.hint}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
              Chance jackpot 200x (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={economyInputs.jackpot200xChancePercent}
                onChange={(event) => setEconomyInputs((current) => ({ ...current, jackpot200xChancePercent: event.target.value }))}
                className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
              />
              <span className="text-[11px] font-medium normal-case tracking-normal text-green-700">Chance de ativar o jackpot 200x no loot</span>
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
              Multiplicador jackpot 20x / 200x
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={economyInputs.jackpot20xMultiplier}
                  onChange={(event) => setEconomyInputs((current) => ({ ...current, jackpot20xMultiplier: event.target.value }))}
                  className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={economyInputs.jackpot200xMultiplier}
                  onChange={(event) => setEconomyInputs((current) => ({ ...current, jackpot200xMultiplier: event.target.value }))}
                  className="rounded-2xl border border-green-900 bg-black/70 px-3 py-3 text-sm font-semibold text-green-200 outline-none transition focus:border-green-600"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">Resumo da economia</p>
              <h2 className="mt-1 text-xl font-black text-green-200">Pools de cashback e jackpots</h2>
            </div>
            <div className="rounded-full border border-green-800 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-500">
              Saldo persistido
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Pool normal</p>
              <p className="mt-2 text-2xl font-black text-green-200">{formatLootCoinsFromCents(parsedSummary?.economyState?.normalBalanceCents ?? 0)} LC</p>
              <p className="mt-1 text-xs text-green-700">Saldo para recompensas comuns dos baús</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot 20x</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{formatLootCoinsFromCents(parsedSummary?.economyState?.jackpot20xBalanceCents ?? 0)} LC</p>
              <p className="mt-1 text-xs text-green-700">Fundo acumulado para o prêmio 20x</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Jackpot 200x</p>
              <p className="mt-2 text-2xl font-black text-fuchsia-300">{formatLootCoinsFromCents(parsedSummary?.economyState?.jackpot200xBalanceCents ?? 0)} LC</p>
              <p className="mt-1 text-xs text-green-700">Fundo acumulado para o prêmio 200x</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">Total distribuído</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{formatLootCoinsFromCents(parsedSummary?.economyState?.totalDistributedCents ?? 0)} LC</p>
              <p className="mt-1 text-xs text-green-700">Valor já pago em recompensas e jackpots</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Fundos captados</p>
              <p className="mt-2 text-xl font-black text-green-200">{formatLootCoinsFromCents(parsedSummary?.economyState?.totalFundedCents ?? 0)} LC</p>
            </article>
            <article className="rounded-2xl border border-green-900 bg-black/20 p-4 text-sm text-green-700">
              <p className="font-semibold uppercase tracking-[0.16em] text-green-600">Prêmios jackpot pagos</p>
              <p className="mt-2 text-xl font-black text-green-200">{formatLootCoinsFromCents(parsedSummary?.economyState?.totalJackpotAwardsCents ?? 0)} LC</p>
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
