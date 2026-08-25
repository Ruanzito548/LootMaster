"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_EXPECTED_VALUE_USD } from "@/lib/chest-loot";
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
    wallets: Record<string, { allocationPercent: number; activationChancePercent: number; minimumWalletReservePercent: number; payoutTiers?: Array<{ payoutPercent: number; probabilityPercent: number }> }>;
  };
  walletEconomyState?: {
    wallets: Record<string, { balanceUsd: number; totalReceivedUsd: number; totalDistributedUsd: number; rewardCount: number; lastMovementAtMs: number }>;
    ledger: Array<Record<string, unknown>>;
    updatedAtMs: number;
  };
};

type FinancialCalculatorConfig = {
  cashbackPercent?: number;
  supplierPercentage?: number;
  cardGatewayFeePercent?: number;
  operationalReservePercent?: number;
};

type WalletInputState = {
  normalAllocationPercent: string;
  jackpotCommonAllocationPercent: string;
  jackpotRareAllocationPercent: string;
  normalActivationChancePercent: string;
  jackpotCommonActivationChancePercent: string;
  jackpotRareActivationChancePercent: string;
  normalMinimumReservePercent: string;
  jackpotCommonMinimumReservePercent: string;
  jackpotRareMinimumReservePercent: string;
};

type AssistantPreview = {
  current: {
    normalAllocationPercent: number;
    jackpotCommonAllocationPercent: number;
    jackpotRareAllocationPercent: number;
    normalActivationChancePercent: number;
    jackpotCommonActivationChancePercent: number;
    jackpotRareActivationChancePercent: number;
  };
  suggested: {
    normalAllocationPercent: number;
    jackpotCommonAllocationPercent: number;
    jackpotRareAllocationPercent: number;
    normalActivationChancePercent: number;
    jackpotCommonActivationChancePercent: number;
    jackpotRareActivationChancePercent: number;
  };
  notes: string[];
};

const CHEST_LABELS: Record<ChestId, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
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

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
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

function parseRarityWeights(raw: string): Array<{ rarity: string; weight: number }> {
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rarity, weight] = entry.split(":");
      return { rarity: rarity?.trim() ?? "common", weight: safeNumber(Number(weight), 1) };
    });
}

function formatRarityWeights(weights: Array<{ rarity: string; weight: number }>): string {
  return weights.map((entry) => `${entry.rarity}:${entry.weight}`).join(", ");
}

function getWalletTone(walletId: "normal" | "jackpotCommon" | "jackpotRare") {
  if (walletId === "normal") return "emerald";
  if (walletId === "jackpotCommon") return "amber";
  return "fuchsia";
}

const WALLET_LABELS: Record<string, string> = {
  normal: "Carteira Normal",
  jackpotCommon: "Jackpot",
  jackpotRare: "Jackpot Lendário",
};

function formatDateTime(value?: string, valueMs?: number): string {
  const date = valueMs ? new Date(valueMs) : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("pt-BR");
}

export default function AdminChestConfigPage() {
  const { user, status } = useProfileSession();

  const [rawJson, setRawJson] = useState("");
  const [draftConfig, setDraftConfig] = useState<ChestConfigPayload | null>(null);
  const [walletInputs, setWalletInputs] = useState<WalletInputState>({
    normalAllocationPercent: "70",
    jackpotCommonAllocationPercent: "25",
    jackpotRareAllocationPercent: "5",
    normalActivationChancePercent: "100",
    jackpotCommonActivationChancePercent: "5",
    jackpotRareActivationChancePercent: "1",
    normalMinimumReservePercent: "0",
    jackpotCommonMinimumReservePercent: "10",
    jackpotRareMinimumReservePercent: "20",
  });
  const [financialConfig, setFinancialConfig] = useState<FinancialCalculatorConfig | null>(null);
  const [exampleOrderUsd, setExampleOrderUsd] = useState("100");
  const [expandedChest, setExpandedChest] = useState<ChestId>("common");
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [assistantPreview, setAssistantPreview] = useState<AssistantPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedSummary = draftConfig;
  const walletState = parsedSummary?.walletEconomyState;

  const allocationSnapshot = useMemo(() => {
    const normal = Number(walletInputs.normalAllocationPercent || 0);
    const common = Number(walletInputs.jackpotCommonAllocationPercent || 0);
    const rare = Number(walletInputs.jackpotRareAllocationPercent || 0);
    const total = normal + common + rare;
    const isBalanced = Math.abs(total - 100) < 0.01;

    return { total, isBalanced, normal, common, rare };
  }, [walletInputs]);

  const cashbackPreview = useMemo(() => {
    const cashbackPercent = Number(financialConfig?.cashbackPercent ?? 0);
    const orderValueUsd = Number(exampleOrderUsd || 0);
    const cashbackUsd = orderValueUsd * (cashbackPercent / 100);
    const normal = cashbackUsd * (allocationSnapshot.normal / 100);
    const common = cashbackUsd * (allocationSnapshot.common / 100);
    const rare = cashbackUsd * (allocationSnapshot.rare / 100);

    return { cashbackPercent, orderValueUsd, cashbackUsd, normal, common, rare };
  }, [allocationSnapshot, exampleOrderUsd, financialConfig]);

  const simulatorPreview = useMemo(() => {
    const baseChestValue = Math.max(0.5, Number(exampleOrderUsd || 0) / 2);
    const expectedChestValueUsd = baseChestValue * (1 + Number(walletInputs.jackpotCommonActivationChancePercent) / 100);
    const expectedJackpotUsd = Math.max(0.01, cashbackPreview.common * (Number(walletInputs.jackpotCommonActivationChancePercent) / 100));

    return {
      expectedChestValueUsd,
      expectedJackpotUsd,
    };
  }, [cashbackPreview.common, exampleOrderUsd, walletInputs.jackpotCommonActivationChancePercent]);

  const walletSupport = useMemo(() => {
    const referenceChest = Math.max(0.01, CHEST_EXPECTED_VALUE_USD.common ?? 1);
    const referenceJackpot = Math.max(0.01, cashbackPreview.common / 10);
    const normalBalance = Number(walletState?.wallets?.normal?.balanceUsd ?? 0);
    const commonBalance = Number(walletState?.wallets?.jackpotCommon?.balanceUsd ?? 0);
    const rareBalance = Number(walletState?.wallets?.jackpotRare?.balanceUsd ?? 0);

    return {
      normalChestSupport: Math.floor(normalBalance / referenceChest),
      commonJackpotSupport: Math.floor(commonBalance / referenceJackpot),
      rareJackpotSupport: Math.floor(rareBalance / Math.max(0.01, referenceJackpot * 3)),
      daysSupport: Math.max(1, Math.floor((normalBalance + commonBalance + rareBalance) / Math.max(0.01, cashbackPreview.cashbackUsd || 1))),
    };
  }, [cashbackPreview.cashbackUsd, cashbackPreview.common, walletState]);

  const policySnapshot = useMemo(() => {
    const state = walletState;
    const walletBalances = Object.values(state?.wallets ?? {}).reduce((sum, wallet) => sum + (wallet?.balanceUsd ?? 0), 0);
    const totalReceived = Object.values(state?.wallets ?? {}).reduce((sum, wallet) => sum + (wallet?.totalReceivedUsd ?? 0), 0);
    const balanceCoveragePercent = totalReceived > 0 ? (walletBalances / totalReceived) * 100 : 0;

    return { totalWalletBalanceUsd: walletBalances, balanceCoveragePercent };
  }, [walletState]);

  const payoutLogEntries = useMemo(() => {
    const entries = walletState?.ledger ?? [];

    return entries
      .filter((entry) => Array.isArray((entry as { metadata?: { items?: unknown[] } }).metadata?.items) && ((entry as { metadata?: { items?: unknown[] } }).metadata?.items?.length ?? 0) > 0)
      .map((entry) => entry as {
        id: string;
        walletId: string;
        amountUsd: number;
        userId?: string;
        createdAt: string;
        createdAtMs?: number;
        metadata?: { userEmail?: string; chestId?: string; items?: Array<{ type: string; title: string; quantity: number; valueUsd: number }> };
      })
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
      .slice(0, 50);
  }, [walletState]);

  const healthSnapshot = useMemo(() => {
    const warnings: string[] = [];
    if (!allocationSnapshot.isBalanced) {
      warnings.push("A alocação não soma 100%.");
    }
    if (policySnapshot.balanceCoveragePercent < 60) {
      warnings.push("A cobertura atual está abaixo do ideal.");
    }
    if (cashbackPreview.cashbackPercent < 5) {
      warnings.push("O fluxo de cashback está fraco para sustentar jackpots.");
    }

    let status: "healthy" | "warning" | "danger" = "healthy";
    if (warnings.length >= 2) status = "danger";
    else if (warnings.length > 0) status = "warning";

    return { status, warnings };
  }, [allocationSnapshot.isBalanced, cashbackPreview.cashbackPercent, policySnapshot.balanceCoveragePercent]);

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
        const [chestResponse, financialResponse] = await Promise.all([
          fetch("/api/admin/rewards/chests-config", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/admin/financial-calculator", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);

        const chestPayload = (await chestResponse.json()) as { config?: ChestConfigPayload; error?: string };
        const financialPayload = (await financialResponse.json()) as { config?: FinancialCalculatorConfig; error?: string };

        if (!chestResponse.ok || !chestPayload.config) {
          throw new Error(chestPayload.error ?? "Could not load chest config.");
        }

        if (!cancelled) {
          const config = chestPayload.config;
          setDraftConfig(config);
          setRawJson(formatJson(config));
          setWalletInputs({
            normalAllocationPercent: String(config.walletEconomy?.wallets?.normal?.allocationPercent ?? 70),
            jackpotCommonAllocationPercent: String(config.walletEconomy?.wallets?.jackpotCommon?.allocationPercent ?? 25),
            jackpotRareAllocationPercent: String(config.walletEconomy?.wallets?.jackpotRare?.allocationPercent ?? 5),
            normalActivationChancePercent: String(config.walletEconomy?.wallets?.normal?.activationChancePercent ?? 100),
            jackpotCommonActivationChancePercent: String(config.walletEconomy?.wallets?.jackpotCommon?.activationChancePercent ?? 5),
            jackpotRareActivationChancePercent: String(config.walletEconomy?.wallets?.jackpotRare?.activationChancePercent ?? 1),
            normalMinimumReservePercent: String(config.walletEconomy?.wallets?.normal?.minimumWalletReservePercent ?? 0),
            jackpotCommonMinimumReservePercent: String(config.walletEconomy?.wallets?.jackpotCommon?.minimumWalletReservePercent ?? 10),
            jackpotRareMinimumReservePercent: String(config.walletEconomy?.wallets?.jackpotRare?.minimumWalletReservePercent ?? 20),
          });
          setFinancialConfig(financialPayload.config ?? null);
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

  const updateChestProfile = (chestId: ChestId, updater: (profile: ChestProfileConfig) => ChestProfileConfig) => {
    setDraftConfig((current) => {
      if (!current) {
        return current;
      }

      const nextByChest = {
        ...current.byChest,
        [chestId]: updater(current.byChest[chestId]),
      };

      const nextConfig = { ...current, byChest: nextByChest };
      setRawJson(formatJson(nextConfig));
      return nextConfig;
    });
  };

  const updateChestRewardOdds = (chestId: ChestId, coinPercent: number, itemPercent: number) => {
    updateChestProfile(chestId, (profile) => {
      const totalWeight = Math.max(1, Math.round(coinPercent * 10 + itemPercent * 10));
      const coinWeight = Math.max(1, Math.round((coinPercent / 100) * totalWeight));
      const itemWeight = Math.max(1, Math.round((itemPercent / 100) * totalWeight));

      return {
        ...profile,
        rewardOdds: [{ type: "coins", weight: coinWeight }, { type: "item", weight: itemWeight }],
      };
    });
  };

  const saveConfig = async (nextWalletEconomy?: Record<string, unknown>) => {
    if (!user || saving) {
      return;
    }

    const allocationTotal = Number(walletInputs.normalAllocationPercent) + Number(walletInputs.jackpotCommonAllocationPercent) + Number(walletInputs.jackpotRareAllocationPercent);
    if (Math.abs(allocationTotal - 100) > 0.01) {
      setErrorMessage("A soma das alocações deve ser exatamente 100% para salvar.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = draftConfig ?? JSON.parse(rawJson || "{}");
      const token = await user.getIdToken();
      const resolvedWalletEconomy = nextWalletEconomy ?? {
        schemaVersion: 1,
        updatedAtMs: Date.now(),
        useUsdAsBaseCurrency: true,
        wallets: {
          normal: {
            allocationPercent: Number(walletInputs.normalAllocationPercent),
            activationChancePercent: Number(walletInputs.normalActivationChancePercent),
            minimumWalletReservePercent: Number(walletInputs.normalMinimumReservePercent),
            payoutTiers: [{ payoutPercent: 5, probabilityPercent: 100 }],
          },
          jackpotCommon: {
            allocationPercent: Number(walletInputs.jackpotCommonAllocationPercent),
            activationChancePercent: Number(walletInputs.jackpotCommonActivationChancePercent),
            minimumWalletReservePercent: Number(walletInputs.jackpotCommonMinimumReservePercent),
            payoutTiers: [
              { payoutPercent: 5, probabilityPercent: 45 },
              { payoutPercent: 10, probabilityPercent: 35 },
              { payoutPercent: 20, probabilityPercent: 15 },
              { payoutPercent: 40, probabilityPercent: 5 },
            ],
          },
          jackpotRare: {
            allocationPercent: Number(walletInputs.jackpotRareAllocationPercent),
            activationChancePercent: Number(walletInputs.jackpotRareActivationChancePercent),
            minimumWalletReservePercent: Number(walletInputs.jackpotRareMinimumReservePercent),
            payoutTiers: [
              { payoutPercent: 10, probabilityPercent: 25 },
              { payoutPercent: 20, probabilityPercent: 25 },
              { payoutPercent: 40, probabilityPercent: 20 },
              { payoutPercent: 60, probabilityPercent: 15 },
              { payoutPercent: 100, probabilityPercent: 15 },
            ],
          },
        },
      };

      const nextPayload = { ...payload, walletEconomy: resolvedWalletEconomy };
      const response = await fetch("/api/admin/rewards/chests-config", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: nextPayload }),
      });

      const responsePayload = (await response.json()) as { config?: ChestConfigPayload; error?: string };
      if (!response.ok || !responsePayload.config) {
        throw new Error(responsePayload.error ?? "Could not save chest config.");
      }

      setDraftConfig(responsePayload.config);
      setRawJson(formatJson(responsePayload.config));
      setSuccessMessage("Configuração salva com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar a configuração.");
    } finally {
      setSaving(false);
    }
  };

  const analyzeEconomy = () => {
    const cashbackPercent = Number(financialConfig?.cashbackPercent ?? 7);
    const current = {
      normalAllocationPercent: Number(walletInputs.normalAllocationPercent),
      jackpotCommonAllocationPercent: Number(walletInputs.jackpotCommonAllocationPercent),
      jackpotRareAllocationPercent: Number(walletInputs.jackpotRareAllocationPercent),
      normalActivationChancePercent: Number(walletInputs.normalActivationChancePercent),
      jackpotCommonActivationChancePercent: Number(walletInputs.jackpotCommonActivationChancePercent),
      jackpotRareActivationChancePercent: Number(walletInputs.jackpotRareActivationChancePercent),
    };

    const suggested = {
      normalAllocationPercent: cashbackPercent >= 7 ? 70 : 75,
      jackpotCommonAllocationPercent: cashbackPercent >= 7 ? 25 : 20,
      jackpotRareAllocationPercent: 100 - (cashbackPercent >= 7 ? 70 : 75) - (cashbackPercent >= 7 ? 25 : 20),
      normalActivationChancePercent: 100,
      jackpotCommonActivationChancePercent: Math.min(20, Math.max(3, cashbackPercent * 0.8)),
      jackpotRareActivationChancePercent: Math.min(6, Math.max(0.7, cashbackPercent * 0.25)),
    };

    setAssistantPreview({ current, suggested, notes: [
      "A carteira normal precisa manter um fluxo constante para recompensas comuns.",
      "Jackpots comuns devem ter chance média para não consumir o fundo rápido.",
      "Jackpots raros devem permanecer mais conservadores para evitar desequilíbrio.",
    ] });
  };

  const applySuggestedEconomy = () => {
    if (!assistantPreview) {
      return;
    }

    setWalletInputs({
      normalAllocationPercent: String(assistantPreview.suggested.normalAllocationPercent),
      jackpotCommonAllocationPercent: String(assistantPreview.suggested.jackpotCommonAllocationPercent),
      jackpotRareAllocationPercent: String(assistantPreview.suggested.jackpotRareAllocationPercent),
      normalActivationChancePercent: String(assistantPreview.suggested.normalActivationChancePercent),
      jackpotCommonActivationChancePercent: String(assistantPreview.suggested.jackpotCommonActivationChancePercent),
      jackpotRareActivationChancePercent: String(assistantPreview.suggested.jackpotRareActivationChancePercent),
      normalMinimumReservePercent: "0",
      jackpotCommonMinimumReservePercent: "10",
      jackpotRareMinimumReservePercent: "20",
    });
    void saveConfig({
      schemaVersion: 1,
      updatedAtMs: Date.now(),
      useUsdAsBaseCurrency: true,
      wallets: {
        normal: {
          allocationPercent: assistantPreview.suggested.normalAllocationPercent,
          activationChancePercent: assistantPreview.suggested.normalActivationChancePercent,
          minimumWalletReservePercent: 0,
          payoutTiers: [{ payoutPercent: 5, probabilityPercent: 100 }],
        },
        jackpotCommon: {
          allocationPercent: assistantPreview.suggested.jackpotCommonAllocationPercent,
          activationChancePercent: assistantPreview.suggested.jackpotCommonActivationChancePercent,
          minimumWalletReservePercent: 10,
          payoutTiers: [{ payoutPercent: 10, probabilityPercent: 100 }],
        },
        jackpotRare: {
          allocationPercent: assistantPreview.suggested.jackpotRareAllocationPercent,
          activationChancePercent: assistantPreview.suggested.jackpotRareActivationChancePercent,
          minimumWalletReservePercent: 20,
          payoutTiers: [{ payoutPercent: 100, probabilityPercent: 100 }],
        },
      },
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black text-green-300">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-green-900/30" />
          <div className="mt-4 h-96 w-full animate-pulse rounded-2xl bg-green-900/20" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-green-200">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-green-900/70 bg-gradient-to-br from-green-950/70 via-black/80 to-emerald-950/70 p-6 shadow-[0_0_80px_rgba(34,197,94,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">Admin / Rewards</p>
              <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">Chest Reward Config</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-green-700">
                Organize a economia dos baús com carteiras, jackpots, saúde financeira e simulações em tempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveConfig()} disabled={!user || saving} className="rounded-full border border-green-600 bg-green-950/70 px-4 py-2 text-sm font-semibold text-green-100 transition hover:bg-green-900 disabled:opacity-40">{saving ? "Salvando..." : "Salvar"}</button>
              <button type="button" onClick={analyzeEconomy} className="rounded-full border border-emerald-700 bg-emerald-950/80 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900">Assistente inteligente</button>
              <Link href="/admin" className="rounded-full border border-green-800 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-950">Voltar</Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          <article className="rounded-3xl border border-green-900/70 bg-black/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-green-600">Cashback atual</p>
            <p className="mt-2 text-2xl font-black text-green-100">{formatPercent(cashbackPreview.cashbackPercent)}</p>
            <p className="mt-1 text-sm text-green-700">Lido da Calculadora Financeira</p>
          </article>
          <article className="rounded-3xl border border-green-900/70 bg-black/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-green-600">Saldo total</p>
            <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(policySnapshot.totalWalletBalanceUsd)} USD</p>
            <p className="mt-1 text-sm text-green-700">Resumo operacional das carteiras</p>
          </article>
          <article className="rounded-3xl border border-green-900/70 bg-black/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-green-600">Cobertura</p>
            <p className="mt-2 text-2xl font-black text-green-100">{policySnapshot.balanceCoveragePercent.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-green-700">Proteção atual das carteiras</p>
          </article>
          <article className="rounded-3xl border border-green-900/70 bg-black/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-green-600">Saúde</p>
            <p className="mt-2 text-2xl font-black text-green-100">{healthSnapshot.status === "healthy" ? "Saudável" : healthSnapshot.status === "warning" ? "Atenção" : "Risco"}</p>
            <p className="mt-1 text-sm text-green-700">Baseada em distribuição e saldo</p>
          </article>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">1. Configuração dos Baús</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Parâmetros individuais por baú</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Cards expansíveis</div>
          </div>

          <div className="mt-4 grid gap-3">
            {CHEST_IDS.map((chestId) => {
              const profile = parsedSummary?.byChest?.[chestId];
              if (!profile) {
                return null;
              }

              const rewards = profile.rewardOdds.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
              const coinChance = rewards > 0 ? (profile.rewardOdds.find((entry) => entry.type === "coins")?.weight ?? 0) / rewards * 100 : 0;
              const itemChance = rewards > 0 ? (profile.rewardOdds.find((entry) => entry.type === "item")?.weight ?? 0) / rewards * 100 : 0;
              const expectedValueUsd = CHEST_EXPECTED_VALUE_USD[chestId] ?? 1;
              // Custo médio: valor esperado + custo marginal dos jackpots (chance * payout médio 5% da carteira)
              const jackpotCommonChance = Number(walletInputs.jackpotCommonActivationChancePercent) / 100;
              const jackpotRareChance = Number(walletInputs.jackpotRareActivationChancePercent) / 100;
              const averageCostUsd = expectedValueUsd + (cashbackPreview.common * jackpotCommonChance * 0.05) + (cashbackPreview.rare * jackpotRareChance * 0.10);
              // Valor médio distribuído: quanto da carteira normal o sistema tende a pagar por baú (5% do saldo normal por baú)
              const normalBalanceUsd = Number(walletState?.wallets?.normal?.balanceUsd ?? 0);
              const averageDistributedUsd = normalBalanceUsd > 0 ? Math.min(expectedValueUsd, normalBalanceUsd * 0.05) : expectedValueUsd * (Number(walletInputs.normalAllocationPercent) / 100) * 0.05;
              const statusTone = expectedValueUsd > 6 ? "warning" : "healthy";

              return (
                <details key={chestId} open={expandedChest === chestId} className="rounded-3xl border border-green-900/70 bg-black/30 p-4" onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open) {
                    setExpandedChest(chestId);
                  }
                }}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-400">{CHEST_LABELS[chestId]}</p>
                      <p className="mt-1 text-xs text-green-700">Coins {coinChance.toFixed(1)}% • Itens {itemChance.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone === "healthy" ? "bg-emerald-950/80 text-emerald-300" : "bg-amber-950/80 text-amber-200"}`}>
                        {statusTone === "healthy" ? "🟢 Balanceado" : "🟡 Atenção"}
                      </span>
                      <span className="text-xs text-green-600">Clique para expandir</span>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Chance de Coins (%)
                      <input type="number" min="0" max="100" step="0.1" value={coinChance.toFixed(1)} onChange={(event) => updateChestRewardOdds(chestId, Number(event.target.value), itemChance)} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Chance de Item (%)
                      <input type="number" min="0" max="100" step="0.1" value={itemChance.toFixed(1)} onChange={(event) => updateChestRewardOdds(chestId, coinChance, Number(event.target.value))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Loot Coins min
                      <input type="number" min="0" step="1" value={profile.coinRange.min} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, coinRange: { ...current.coinRange, min: Number(event.target.value) } }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Loot Coins max
                      <input type="number" min="0" step="1" value={profile.coinRange.max} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, coinRange: { ...current.coinRange, max: Number(event.target.value) } }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Chance Fragmento (%)
                      <input type="number" min="0" max="100" step="1" value={profile.giftCardFragment.chancePercent} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, giftCardFragment: { ...current.giftCardFragment, chancePercent: Number(event.target.value) } }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Chance Gift Card (%)
                      <input type="number" min="0" max="100" step="1" value={profile.fullGiftCard.chancePercent} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, fullGiftCard: { ...current.fullGiftCard, chancePercent: Number(event.target.value) } }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Chance de Conta (%)
                      <input type="number" min="0" max="100" step="1" value={profile.accountDrop.chancePercent} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, accountDrop: { ...current.accountDrop, chancePercent: Number(event.target.value) } }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                      Distribuição das raridades
                      <input type="text" value={formatRarityWeights(profile.itemRarityWeights)} onChange={(event) => updateChestProfile(chestId, (current) => ({ ...current, itemRarityWeights: parseRarityWeights(event.target.value) }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    </label>
                    <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Valor esperado estimado</p>
                      <p className="mt-2 text-xl font-black text-green-100">{formatUsd(expectedValueUsd)} USD</p>
                    </article>
                    <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Custo médio esperado</p>
                      <p className="mt-2 text-xl font-black text-green-100">{formatUsd(averageCostUsd)} USD</p>
                    </article>
                    <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Valor médio distribuído</p>
                      <p className="mt-2 text-xl font-black text-green-100">{formatUsd(averageDistributedUsd)} USD</p>
                    </article>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">2. Economia das Carteiras</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Distribuição do cashback</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Preview em tempo real</div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { key: "normalAllocationPercent", label: "Carteira Normal", color: "text-emerald-300" },
                  { key: "jackpotCommonAllocationPercent", label: "Jackpot", color: "text-amber-300" },
                  { key: "jackpotRareAllocationPercent", label: "Jackpot Lendário", color: "text-fuchsia-300" },
                ].map((field) => (
                  <label key={field.key} className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    {field.label}
                    <input type="number" min="0" max="100" step="0.01" value={walletInputs[field.key as keyof WalletInputState]} onChange={(event) => setWalletInputs((current) => ({ ...current, [field.key]: event.target.value }))} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                    <span className={`text-sm font-black ${field.color}`}>{Number(walletInputs[field.key as keyof WalletInputState]).toFixed(2)}%</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-green-900/70 bg-black/20 p-3">
                <div className="flex items-center justify-between text-sm text-green-700">
                  <span>Soma atual</span>
                  <span className={allocationSnapshot.isBalanced ? "font-black text-emerald-300" : "font-black text-rose-300"}>{allocationSnapshot.total.toFixed(2)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-950/80">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600" style={{ width: `${Math.min(100, allocationSnapshot.total)}%` }} />
                </div>
                {!allocationSnapshot.isBalanced ? <p className="mt-2 text-sm text-rose-300">A soma deve ser exatamente 100% para salvar.</p> : <p className="mt-2 text-sm text-emerald-300">Distribuição válida e pronta para salvar.</p>}
              </div>
            </div>

            <div className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">Preview do cashback</p>
              <div className="mt-3 grid gap-3">
                <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Cashback financeiro</p>
                  <p className="mt-2 text-2xl font-black text-green-100">{formatPercent(cashbackPreview.cashbackPercent)}</p>
                </article>
                <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Pedido de exemplo</p>
                  <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(cashbackPreview.orderValueUsd)} USD</p>
                  <input type="number" min="1" value={exampleOrderUsd} onChange={(event) => setExampleOrderUsd(event.target.value)} className="mt-3 w-full rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                </article>
                <div className="grid gap-2 sm:grid-cols-3">
                  <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Normal</p>
                    <p className="mt-2 text-xl font-black text-emerald-300">{formatUsd(cashbackPreview.normal)} USD</p>
                  </article>
                  <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Comum</p>
                    <p className="mt-2 text-xl font-black text-amber-300">{formatUsd(cashbackPreview.common)} USD</p>
                  </article>
                  <article className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Raro</p>
                    <p className="mt-2 text-xl font-black text-fuchsia-300">{formatUsd(cashbackPreview.rare)} USD</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">3. Configuração dos Jackpots</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Jackpot e Jackpot Lendário</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Faixas e probabilidades</div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[
              { key: "jackpotCommon", label: "Jackpot", chance: Number(walletInputs.jackpotCommonActivationChancePercent), reserve: Number(walletInputs.jackpotCommonMinimumReservePercent), color: "text-amber-300" },
              { key: "jackpotRare", label: "Jackpot Lendário", chance: Number(walletInputs.jackpotRareActivationChancePercent), reserve: Number(walletInputs.jackpotRareMinimumReservePercent), color: "text-fuchsia-300" },
            ].map((tier) => (
              <article key={tier.key} className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">{tier.label}</p>
                  <span className={`text-sm font-black ${tier.color}`}>Chance {tier.chance.toFixed(2)}%</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    Chance de ativação
                    <input type="number" min="0" max="100" step="0.01" value={tier.key === "jackpotCommon" ? walletInputs.jackpotCommonActivationChancePercent : walletInputs.jackpotRareActivationChancePercent} onChange={(event) => setWalletInputs((current) => tier.key === "jackpotCommon" ? { ...current, jackpotCommonActivationChancePercent: event.target.value } : { ...current, jackpotRareActivationChancePercent: event.target.value })} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    Reserva mínima
                    <input type="number" min="0" max="100" step="0.01" value={tier.key === "jackpotCommon" ? walletInputs.jackpotCommonMinimumReservePercent : walletInputs.jackpotRareMinimumReservePercent} onChange={(event) => setWalletInputs((current) => tier.key === "jackpotCommon" ? { ...current, jackpotCommonMinimumReservePercent: event.target.value } : { ...current, jackpotRareMinimumReservePercent: event.target.value })} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
                  </label>
                </div>
                <div className="mt-3 rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                  <div className="flex items-center justify-between">
                    <span>Reserva vigente</span>
                    <span className={`font-black ${tier.color}`}>{tier.reserve.toFixed(2)}%</span>
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Valor esperado</p>
                  <p className="mt-2 text-xl font-black text-green-100">{formatUsd(tier.key === "jackpotCommon" ? cashbackPreview.common : cashbackPreview.rare)} USD</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">4. Carteiras (Wallet Dashboard)</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Visão geral das três carteiras</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Barras e métricas</div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              { key: "normal", label: "Carteira Normal", color: "from-emerald-500 to-green-400", balance: walletState?.wallets?.normal?.balanceUsd ?? 0, received: walletState?.wallets?.normal?.totalReceivedUsd ?? 0, distributed: walletState?.wallets?.normal?.totalDistributedUsd ?? 0, rewardCount: walletState?.wallets?.normal?.rewardCount ?? 0 },
              { key: "jackpotCommon", label: "Jackpot", color: "from-amber-500 to-yellow-400", balance: walletState?.wallets?.jackpotCommon?.balanceUsd ?? 0, received: walletState?.wallets?.jackpotCommon?.totalReceivedUsd ?? 0, distributed: walletState?.wallets?.jackpotCommon?.totalDistributedUsd ?? 0, rewardCount: walletState?.wallets?.jackpotCommon?.rewardCount ?? 0 },
              { key: "jackpotRare", label: "Jackpot Lendário", color: "from-fuchsia-500 to-violet-400", balance: walletState?.wallets?.jackpotRare?.balanceUsd ?? 0, received: walletState?.wallets?.jackpotRare?.totalReceivedUsd ?? 0, distributed: walletState?.wallets?.jackpotRare?.totalDistributedUsd ?? 0, rewardCount: walletState?.wallets?.jackpotRare?.rewardCount ?? 0 },
            ].map((wallet) => {
              const progress = Math.min(100, Math.round((wallet.balance / Math.max(1, wallet.received || wallet.balance || 1)) * 100));
              return (
                <article key={wallet.key} className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">{wallet.label}</p>
                  <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(wallet.balance)} USD</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-green-950/80">
                    <div className={`h-full rounded-full bg-gradient-to-r ${wallet.color}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-green-700">
                    <div className="flex items-center justify-between"><span>Total recebido</span><span className="font-semibold text-green-100">{formatUsd(wallet.received)} USD</span></div>
                    <div className="flex items-center justify-between"><span>Total distribuído</span><span className="font-semibold text-green-100">{formatUsd(wallet.distributed)} USD</span></div>
                    <div className="flex items-center justify-between"><span>Prêmios</span><span className="font-semibold text-green-100">{wallet.rewardCount}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">4.1 Log de Pagamentos</p>
              <h2 className="mt-1 text-xl font-black text-green-100">O que foi enviado para os clientes</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Últimos {payoutLogEntries.length} registros</div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-green-900/70">
            <table className="w-full min-w-[720px] text-left text-sm text-green-700">
              <thead className="bg-black/40 text-[11px] font-bold uppercase tracking-[0.16em] text-green-600">
                <tr>
                  <th className="px-3 py-2">Data/Hora</th>
                  <th className="px-3 py-2">Carteira</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Itens</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {payoutLogEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-green-700">Nenhum pagamento registrado ainda.</td>
                  </tr>
                ) : (
                  payoutLogEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-green-900/50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(entry.createdAt, entry.createdAtMs)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{WALLET_LABELS[entry.walletId] ?? entry.walletId}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{entry.metadata?.userEmail ?? entry.userId ?? "—"}</td>
                      <td className="px-3 py-2">
                        {(entry.metadata?.items ?? []).map((item, index) => (
                          <span key={`${entry.id}-${index}`} className="mr-2 inline-block">
                            {item.quantity}x {item.title} ({formatUsd(item.valueUsd)} USD)
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-green-100 whitespace-nowrap">{formatUsd(entry.amountUsd)} USD</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">5. Simulador da Economia</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Impacto instantâneo de um pedido</h2>
            </div>
            <div className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Sem alterar os saldos reais</div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                Valor do pedido
                <input type="number" min="1" value={exampleOrderUsd} onChange={(event) => setExampleOrderUsd(event.target.value)} className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100" />
              </label>
              <div className="mt-3 rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Cashback gerado</p>
                <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(cashbackPreview.cashbackUsd)} USD</p>
              </div>
            </article>
            <article className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-green-900/70 bg-black/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Carteira Normal</p>
                  <p className="mt-2 text-xl font-black text-emerald-300">{formatUsd(cashbackPreview.normal)} USD</p>
                </div>
                <div className="rounded-2xl border border-green-900/70 bg-black/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Jackpot</p>
                  <p className="mt-2 text-xl font-black text-amber-300">{formatUsd(cashbackPreview.common)} USD</p>
                </div>
                <div className="rounded-2xl border border-green-900/70 bg-black/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Jackpot Lendário</p>
                  <p className="mt-2 text-xl font-black text-fuchsia-300">{formatUsd(cashbackPreview.rare)} USD</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">EV dos baús</p>
                  <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(simulatorPreview.expectedChestValueUsd)} USD</p>
                </div>
                <div className="rounded-2xl border border-green-900/70 bg-black/20 p-3 text-sm text-green-700">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Valor estimado de jackpot</p>
                  <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(simulatorPreview.expectedJackpotUsd)} USD</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">6. Saúde da Economia</p>
              <h2 className="mt-1 text-xl font-black text-green-100">Diagnóstico automático</h2>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${healthSnapshot.status === "healthy" ? "border-emerald-800/80 bg-emerald-950/70 text-emerald-300" : healthSnapshot.status === "warning" ? "border-amber-800/80 bg-amber-950/70 text-amber-300" : "border-rose-800/80 bg-rose-950/70 text-rose-300"}`}>
              {healthSnapshot.status === "healthy" ? "🟢 Economia saudável" : healthSnapshot.status === "warning" ? "🟡 Atenção" : "🔴 Risco"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <article className="rounded-3xl border border-green-900/70 bg-black/30 p-4 text-sm text-green-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">EV dos baús</p>
              <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(CHEST_EXPECTED_VALUE_USD.common ?? 1)} USD</p>
            </article>
            <article className="rounded-3xl border border-green-900/70 bg-black/30 p-4 text-sm text-green-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">EV dos jackpots</p>
              <p className="mt-2 text-2xl font-black text-green-100">{formatUsd(Math.max(0.01, cashbackPreview.common * (Number(walletInputs.jackpotCommonActivationChancePercent) / 100)))} USD</p>
            </article>
            <article className="rounded-3xl border border-green-900/70 bg-black/30 p-4 text-sm text-green-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600">Cobertura das carteiras</p>
              <p className="mt-2 text-2xl font-black text-green-100">{policySnapshot.balanceCoveragePercent.toFixed(1)}%</p>
            </article>
          </div>

          <div className="mt-3 rounded-3xl border border-green-900/70 bg-black/20 p-4 text-sm text-green-700">
            <ul className="space-y-2">
              {healthSnapshot.warnings.length > 0 ? healthSnapshot.warnings.map((warning) => <li key={warning}>• {warning}</li>) : <li>• Economia está saudável e os parâmetros se mantêm sustentáveis.</li>}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-green-900/70 bg-green-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-green-600">7. Configuração Avançada</p>
              <h2 className="mt-1 text-xl font-black text-green-100">JSON recolhido por padrão</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdvancedJson((current) => !current)} className="rounded-full border border-green-800/70 px-3 py-1 text-sm font-semibold text-green-400 transition hover:bg-green-950">{showAdvancedJson ? "Recolher" : "Expandir"}</button>
            </div>
          </div>

          {showAdvancedJson ? (
            <div className="mt-4">
              <textarea value={rawJson} onChange={(event) => {
                const nextValue = event.target.value;
                setRawJson(nextValue);
                try {
                  const parsed = JSON.parse(nextValue) as ChestConfigPayload;
                  setDraftConfig(parsed);
                } catch {
                  // keep the previous parsed config while the JSON is invalid
                }
              }} className="min-h-[360px] w-full rounded-3xl border border-green-900/70 bg-black/70 p-4 font-mono text-xs text-green-100 outline-none" spellCheck={false} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRawJson(formatJson(draftConfig))} className="rounded-full border border-green-800/70 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-950">Format JSON</button>
                <button type="button" onClick={() => navigator.clipboard.writeText(rawJson)} className="rounded-full border border-green-800/70 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-950">Exportar</button>
                <button type="button" onClick={() => {
                  const defaultConfig = formatJson(draftConfig ?? {});
                  setRawJson(defaultConfig);
                }} className="rounded-full border border-green-800/70 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-950">Restaurar padrão</button>
              </div>
            </div>
          ) : null}
        </section>

        {assistantPreview ? (
          <section className="mt-6 rounded-[28px] border border-emerald-900/70 bg-emerald-950/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Assistente inteligente</p>
                <h2 className="mt-1 text-xl font-black text-green-100">Comparativo atual vs sugerido</h2>
              </div>
              <button type="button" onClick={applySuggestedEconomy} className="rounded-full border border-emerald-500 bg-emerald-950/80 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900">Aplicar sugestão</button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">Configuração atual</p>
                <div className="mt-3 space-y-2 text-sm text-green-700">
                  <div className="flex items-center justify-between"><span>Normal</span><span className="font-semibold text-green-100">{assistantPreview.current.normalAllocationPercent}%</span></div>
                  <div className="flex items-center justify-between"><span>Jackpot</span><span className="font-semibold text-green-100">{assistantPreview.current.jackpotCommonAllocationPercent}%</span></div>
                  <div className="flex items-center justify-between"><span>Jackpot Lendário</span><span className="font-semibold text-green-100">{assistantPreview.current.jackpotRareAllocationPercent}%</span></div>
                </div>
              </div>
              <div className="rounded-3xl border border-green-900/70 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">Configuração sugerida</p>
                <div className="mt-3 space-y-2 text-sm text-green-700">
                  <div className="flex items-center justify-between"><span>Normal</span><span className="font-semibold text-green-100">{assistantPreview.suggested.normalAllocationPercent}%</span></div>
                  <div className="flex items-center justify-between"><span>Jackpot</span><span className="font-semibold text-green-100">{assistantPreview.suggested.jackpotCommonAllocationPercent}%</span></div>
                  <div className="flex items-center justify-between"><span>Jackpot Lendário</span><span className="font-semibold text-green-100">{assistantPreview.suggested.jackpotRareAllocationPercent}%</span></div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-3xl border border-green-900/70 bg-black/20 p-4 text-sm text-green-700">
              <ul className="space-y-2">
                {assistantPreview.notes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>
          </section>
        ) : null}

        {successMessage ? <p className="mt-4 text-sm font-semibold text-emerald-400">{successMessage}</p> : null}
        {errorMessage ? <p className="mt-4 text-sm font-semibold text-rose-400">{errorMessage}</p> : null}
      </main>
    </div>
  );
}
