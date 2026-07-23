import { CHEST_EXPECTED_VALUE_USD } from "./chest-loot";
import type { ChestId } from "./chests";

export type ChestWalletKey = "normal" | "jackpotCommon" | "jackpotRare";

export type ChestWalletPayoutTier = {
  payoutPercent: number;
  probabilityPercent: number;
};

export type ChestWalletConfig = {
  id: ChestWalletKey;
  label: string;
  allocationPercent: number;
  rewardProbabilityPercent: number;
  rewardPercentages: number[];
  safetyBufferPercent: number;
  payoutTiers: ChestWalletPayoutTier[];
};

export type ChestWalletEconomyConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  wallets: Record<ChestWalletKey, ChestWalletConfig>;
  jackpotCommonChancePercent: number;
  jackpotRareChancePercent: number;
  useUsdAsBaseCurrency: boolean;
};

export type ChestWalletLedgerEntry = {
  id: string;
  walletKey: ChestWalletKey;
  movementType: "credit" | "reward" | "jackpot" | "adjustment" | "refund";
  amountUsd: number;
  balanceBeforeUsd: number;
  balanceAfterUsd: number;
  source: string;
  referenceId?: string;
  createdAtMs: number;
  metadata?: Record<string, unknown>;
};

export type ChestWalletEconomyState = {
  wallets: Record<ChestWalletKey, { balanceUsd: number; totalReceivedUsd: number; totalDistributedUsd: number; rewardCount: number; lastMovementAtMs: number }>;
  ledger: ChestWalletLedgerEntry[];
  updatedAtMs: number;
};

export type ChestWalletReward = {
  walletKey: ChestWalletKey;
  type: "normal" | "jackpot-common" | "jackpot-rare";
  amountUsd: number;
  percentOfWallet: number;
  reason: string;
};

export const CHEST_WALLET_ECONOMY_SCHEMA_VERSION = 1;

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function roundUsd(value: number): number {
  return Number(value.toFixed(4));
}

function normalizePayoutTiers(walletConfig: ChestWalletConfig): ChestWalletPayoutTier[] {
  const source = Array.isArray(walletConfig.payoutTiers) ? walletConfig.payoutTiers : [];
  const normalized = source
    .map((tier) => {
      if (!tier || typeof tier !== "object") {
        return null;
      }

      const payoutPercent = clampNonNegative(Number(tier.payoutPercent ?? 0));
      const probabilityPercent = clampNonNegative(Number(tier.probabilityPercent ?? 0));
      if (payoutPercent <= 0 || probabilityPercent <= 0) {
        return null;
      }

      return { payoutPercent, probabilityPercent };
    })
    .filter((tier): tier is ChestWalletPayoutTier => Boolean(tier));

  if (normalized.length > 0) {
    return normalized;
  }

  return (walletConfig.rewardPercentages ?? []).map((payoutPercent, index) => ({
    payoutPercent: clampNonNegative(payoutPercent),
    probabilityPercent: index === 0 ? 100 : 0,
  }));
}

function resolveTierPayoutPercent(walletConfig: ChestWalletConfig, randomValue: number): number {
  const tiers = normalizePayoutTiers(walletConfig);
  const totalProbability = tiers.reduce((sum, tier) => sum + tier.probabilityPercent, 0);
  if (totalProbability <= 0) {
    return tiers[0]?.payoutPercent ?? walletConfig.rewardPercentages[0] ?? 5;
  }

  const normalizedValue = clampPercent(randomValue, 0);
  const threshold = (normalizedValue / 100) * totalProbability;
  let cumulative = 0;

  for (const tier of tiers) {
    cumulative += tier.probabilityPercent;
    if (threshold <= cumulative) {
      return tier.payoutPercent;
    }
  }

  return tiers[tiers.length - 1]?.payoutPercent ?? walletConfig.rewardPercentages[0] ?? 5;
}

export function buildDefaultChestWalletEconomyConfig(): ChestWalletEconomyConfig {
  return {
    schemaVersion: CHEST_WALLET_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: Date.now(),
    useUsdAsBaseCurrency: true,
    jackpotCommonChancePercent: 5,
    jackpotRareChancePercent: 1,
    wallets: {
      normal: {
        id: "normal",
        label: "Carteira Normal",
        allocationPercent: 70,
        rewardProbabilityPercent: 100,
        rewardPercentages: [5],
        safetyBufferPercent: 0,
        payoutTiers: [{ payoutPercent: 5, probabilityPercent: 100 }],
      },
      jackpotCommon: {
        id: "jackpotCommon",
        label: "Carteira Jackpot Comum",
        allocationPercent: 25,
        rewardProbabilityPercent: 10,
        rewardPercentages: [5, 10, 20, 40],
        safetyBufferPercent: 10,
        payoutTiers: [
          { payoutPercent: 5, probabilityPercent: 45 },
          { payoutPercent: 10, probabilityPercent: 35 },
          { payoutPercent: 20, probabilityPercent: 15 },
          { payoutPercent: 40, probabilityPercent: 5 },
        ],
      },
      jackpotRare: {
        id: "jackpotRare",
        label: "Carteira Jackpot Raro",
        allocationPercent: 5,
        rewardProbabilityPercent: 2,
        rewardPercentages: [10, 20, 40, 60, 100],
        safetyBufferPercent: 20,
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
}

export function buildDefaultChestWalletEconomyState(): ChestWalletEconomyState {
  return {
    wallets: {
      normal: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
      jackpotCommon: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
      jackpotRare: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
    },
    ledger: [],
    updatedAtMs: Date.now(),
  };
}

export function sanitizeChestWalletEconomyConfig(source: unknown): ChestWalletEconomyConfig {
  const fallback = buildDefaultChestWalletEconomyConfig();
  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<ChestWalletEconomyConfig> & { wallets?: Record<string, unknown> };
  const wallets = parsed.wallets && typeof parsed.wallets === "object" ? parsed.wallets : fallback.wallets;

  const normalizedWallets = {
    normal: {
      ...fallback.wallets.normal,
      ...(wallets.normal && typeof wallets.normal === "object" ? wallets.normal : {}),
      allocationPercent: clampPercent((wallets.normal as { allocationPercent?: number } | undefined)?.allocationPercent ?? fallback.wallets.normal.allocationPercent, fallback.wallets.normal.allocationPercent),
      rewardProbabilityPercent: clampPercent((wallets.normal as { rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.normal.rewardProbabilityPercent, fallback.wallets.normal.rewardProbabilityPercent),
      rewardPercentages: Array.isArray((wallets.normal as { rewardPercentages?: number[] } | undefined)?.rewardPercentages) ? ((wallets.normal as { rewardPercentages?: number[] }).rewardPercentages ?? []).filter((value): value is number => typeof value === "number") : fallback.wallets.normal.rewardPercentages,
      safetyBufferPercent: clampPercent((wallets.normal as { safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.normal.safetyBufferPercent, fallback.wallets.normal.safetyBufferPercent),
      payoutTiers: Array.isArray((wallets.normal as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.normal as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.normal.payoutTiers,
    },
    jackpotCommon: {
      ...fallback.wallets.jackpotCommon,
      ...(wallets.jackpotCommon && typeof wallets.jackpotCommon === "object" ? wallets.jackpotCommon : {}),
      allocationPercent: clampPercent((wallets.jackpotCommon as { allocationPercent?: number } | undefined)?.allocationPercent ?? fallback.wallets.jackpotCommon.allocationPercent, fallback.wallets.jackpotCommon.allocationPercent),
      rewardProbabilityPercent: clampPercent((wallets.jackpotCommon as { rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.jackpotCommon.rewardProbabilityPercent, fallback.wallets.jackpotCommon.rewardProbabilityPercent),
      rewardPercentages: Array.isArray((wallets.jackpotCommon as { rewardPercentages?: number[] } | undefined)?.rewardPercentages) ? ((wallets.jackpotCommon as { rewardPercentages?: number[] }).rewardPercentages ?? []).filter((value): value is number => typeof value === "number") : fallback.wallets.jackpotCommon.rewardPercentages,
      safetyBufferPercent: clampPercent((wallets.jackpotCommon as { safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.jackpotCommon.safetyBufferPercent, fallback.wallets.jackpotCommon.safetyBufferPercent),
      payoutTiers: Array.isArray((wallets.jackpotCommon as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.jackpotCommon as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.jackpotCommon.payoutTiers,
    },
    jackpotRare: {
      ...fallback.wallets.jackpotRare,
      ...(wallets.jackpotRare && typeof wallets.jackpotRare === "object" ? wallets.jackpotRare : {}),
      allocationPercent: clampPercent((wallets.jackpotRare as { allocationPercent?: number } | undefined)?.allocationPercent ?? fallback.wallets.jackpotRare.allocationPercent, fallback.wallets.jackpotRare.allocationPercent),
      rewardProbabilityPercent: clampPercent((wallets.jackpotRare as { rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.jackpotRare.rewardProbabilityPercent, fallback.wallets.jackpotRare.rewardProbabilityPercent),
      rewardPercentages: Array.isArray((wallets.jackpotRare as { rewardPercentages?: number[] } | undefined)?.rewardPercentages) ? ((wallets.jackpotRare as { rewardPercentages?: number[] }).rewardPercentages ?? []).filter((value): value is number => typeof value === "number") : fallback.wallets.jackpotRare.rewardPercentages,
      safetyBufferPercent: clampPercent((wallets.jackpotRare as { safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.jackpotRare.safetyBufferPercent, fallback.wallets.jackpotRare.safetyBufferPercent),
      payoutTiers: Array.isArray((wallets.jackpotRare as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.jackpotRare as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.jackpotRare.payoutTiers,
    },
  } as Record<ChestWalletKey, ChestWalletConfig>;

  const totalAllocation = Object.values(normalizedWallets).reduce((sum, wallet) => sum + wallet.allocationPercent, 0);
  if (totalAllocation !== 100) {
    normalizedWallets.normal.allocationPercent = 70;
    normalizedWallets.jackpotCommon.allocationPercent = 25;
    normalizedWallets.jackpotRare.allocationPercent = 5;
  }

  return {
    schemaVersion: CHEST_WALLET_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: clampNonNegative(parsed.updatedAtMs ?? Date.now()),
    useUsdAsBaseCurrency: parsed.useUsdAsBaseCurrency ?? true,
    jackpotCommonChancePercent: clampPercent(parsed.jackpotCommonChancePercent ?? fallback.jackpotCommonChancePercent, fallback.jackpotCommonChancePercent),
    jackpotRareChancePercent: clampPercent(parsed.jackpotRareChancePercent ?? fallback.jackpotRareChancePercent, fallback.jackpotRareChancePercent),
    wallets: normalizedWallets,
  };
}

export function fundChestWalletEconomyFromCashback(state: ChestWalletEconomyState, cashbackUsd: number, config: ChestWalletEconomyConfig): ChestWalletEconomyState {
  if (cashbackUsd <= 0) {
    return state;
  }

  const nextState = { ...state, wallets: { ...state.wallets }, ledger: [...state.ledger] };
  const totalAllocation = Object.values(config.wallets).reduce((sum, wallet) => sum + wallet.allocationPercent, 0);
  const normalizedFactor = totalAllocation > 0 ? 100 / totalAllocation : 1;

  for (const walletKey of Object.keys(config.wallets) as ChestWalletKey[]) {
    const walletConfig = config.wallets[walletKey];
    const amountUsd = roundUsd(cashbackUsd * (walletConfig.allocationPercent * normalizedFactor / 100));
    const wallet = nextState.wallets[walletKey];

    wallet.balanceUsd = roundUsd(wallet.balanceUsd + amountUsd);
    wallet.totalReceivedUsd = roundUsd(wallet.totalReceivedUsd + amountUsd);
    wallet.lastMovementAtMs = Date.now();

    nextState.ledger.push({
      id: `credit-${walletKey}-${Date.now()}-${nextState.ledger.length}`,
      walletKey,
      movementType: "credit",
      amountUsd,
      balanceBeforeUsd: roundUsd(wallet.balanceUsd - amountUsd),
      balanceAfterUsd: roundUsd(wallet.balanceUsd),
      source: "cashback",
      referenceId: "cashback",
      createdAtMs: Date.now(),
      metadata: { type: "cashback", amountUsd },
    });
  }

  nextState.updatedAtMs = Date.now();
  return nextState;
}

export function resolveChestWalletReward(chestId: ChestId, config: ChestWalletEconomyConfig, state: ChestWalletEconomyState, randomValue: number): ChestWalletReward | null {
  const baseRewardUsd = Math.max(0.01, CHEST_EXPECTED_VALUE_USD[chestId] ?? 1);

  const walletChance = clampPercent(config.jackpotCommonChancePercent, 5);
  const rareWalletChance = clampPercent(config.jackpotRareChancePercent, 1);
  const randomPercent = clampPercent(randomValue, 0);

  const commonWallet = state.wallets.jackpotCommon;
  const rareWallet = state.wallets.jackpotRare;
  const normalWallet = state.wallets.normal;

  if (commonWallet.balanceUsd > 0 && randomPercent <= walletChance) {
    const percentOfWallet = resolveTierPayoutPercent(config.wallets.jackpotCommon, randomPercent);
    const payoutUsd = roundUsd(commonWallet.balanceUsd * (percentOfWallet / 100));
    return { walletKey: "jackpotCommon", type: "jackpot-common", amountUsd: payoutUsd, percentOfWallet, reason: "jackpot-common" };
  }

  if (rareWallet.balanceUsd > 0 && randomPercent <= rareWalletChance) {
    const percentOfWallet = resolveTierPayoutPercent(config.wallets.jackpotRare, randomPercent);
    const payoutUsd = roundUsd(rareWallet.balanceUsd * (percentOfWallet / 100));
    return { walletKey: "jackpotRare", type: "jackpot-rare", amountUsd: payoutUsd, percentOfWallet, reason: "jackpot-rare" };
  }

  if (normalWallet.balanceUsd > 0) {
    return { walletKey: "normal", type: "normal", amountUsd: roundUsd(baseRewardUsd), percentOfWallet: 100, reason: "normal-reward" };
  }

  return null;
}

export function applyChestWalletReward(state: ChestWalletEconomyState, reward: ChestWalletReward): ChestWalletEconomyState {
  const nextState = { ...state, wallets: { ...state.wallets }, ledger: [...state.ledger] };
  const wallet = nextState.wallets[reward.walletKey];

  const previousBalance = wallet.balanceUsd;
  const nextBalance = roundUsd(Math.max(0, wallet.balanceUsd - reward.amountUsd));
  wallet.balanceUsd = nextBalance;
  wallet.totalDistributedUsd = roundUsd(wallet.totalDistributedUsd + reward.amountUsd);
  wallet.rewardCount = wallet.rewardCount + 1;
  wallet.lastMovementAtMs = Date.now();

  nextState.ledger.push({
    id: `reward-${reward.walletKey}-${Date.now()}-${nextState.ledger.length}`,
    walletKey: reward.walletKey,
    movementType: reward.type === "normal" ? "reward" : "jackpot",
    amountUsd: roundUsd(reward.amountUsd),
    balanceBeforeUsd: roundUsd(previousBalance),
    balanceAfterUsd: roundUsd(nextBalance),
    source: reward.type === "normal" ? "chest" : "jackpot",
    referenceId: reward.type,
    createdAtMs: Date.now(),
    metadata: { percentOfWallet: reward.percentOfWallet, reason: reward.reason },
  });

  nextState.updatedAtMs = Date.now();
  return nextState;
}
