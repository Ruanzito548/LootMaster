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
  activationChancePercent: number;
  minimumWalletReservePercent: number;
  payoutTiers: ChestWalletPayoutTier[];
};

export type ChestWalletEconomyConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  wallets: Record<ChestWalletKey, ChestWalletConfig>;
  useUsdAsBaseCurrency: boolean;
};

export type ChestWalletLedgerEntry = {
  id: string;
  walletId: ChestWalletKey;
  type: "funding" | "reward" | "jackpot" | "adjustment" | "refund";
  amountUsd: number;
  balanceBeforeUsd: number;
  balanceAfterUsd: number;
  orderId?: string;
  rewardId?: string;
  userId?: string;
  description: string;
  createdAt: string;
  source?: string;
  referenceId?: string;
  createdAtMs?: number;
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

  return [{ payoutPercent: 5, probabilityPercent: 100 }];
}

function resolveTierPayoutPercent(walletConfig: ChestWalletConfig, randomValue: number): number {
  const tiers = normalizePayoutTiers(walletConfig);
  const totalProbability = tiers.reduce((sum, tier) => sum + tier.probabilityPercent, 0);
  if (totalProbability <= 0) {
    return tiers[0]?.payoutPercent ?? 5;
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

  return tiers[tiers.length - 1]?.payoutPercent ?? 5;
}

export function buildDefaultChestWalletEconomyConfig(): ChestWalletEconomyConfig {
  return {
    schemaVersion: CHEST_WALLET_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: Date.now(),
    useUsdAsBaseCurrency: true,
    wallets: {
      normal: {
        id: "normal",
        label: "Carteira Normal",
        allocationPercent: 70,
        activationChancePercent: 100,
        minimumWalletReservePercent: 0,
        payoutTiers: [{ payoutPercent: 5, probabilityPercent: 100 }],
      },
      jackpotCommon: {
        id: "jackpotCommon",
        label: "Carteira Jackpot Comum",
        allocationPercent: 25,
        activationChancePercent: 5,
        minimumWalletReservePercent: 10,
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
        activationChancePercent: 1,
        minimumWalletReservePercent: 20,
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
      activationChancePercent: clampPercent((wallets.normal as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.activationChancePercent ?? (wallets.normal as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.normal.activationChancePercent, fallback.wallets.normal.activationChancePercent),
      minimumWalletReservePercent: clampPercent((wallets.normal as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.minimumWalletReservePercent ?? (wallets.normal as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.normal.minimumWalletReservePercent, fallback.wallets.normal.minimumWalletReservePercent),
      payoutTiers: Array.isArray((wallets.normal as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.normal as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.normal.payoutTiers,
    },
    jackpotCommon: {
      ...fallback.wallets.jackpotCommon,
      ...(wallets.jackpotCommon && typeof wallets.jackpotCommon === "object" ? wallets.jackpotCommon : {}),
      allocationPercent: clampPercent((wallets.jackpotCommon as { allocationPercent?: number } | undefined)?.allocationPercent ?? fallback.wallets.jackpotCommon.allocationPercent, fallback.wallets.jackpotCommon.allocationPercent),
      activationChancePercent: clampPercent((wallets.jackpotCommon as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.activationChancePercent ?? (wallets.jackpotCommon as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.jackpotCommon.activationChancePercent, fallback.wallets.jackpotCommon.activationChancePercent),
      minimumWalletReservePercent: clampPercent((wallets.jackpotCommon as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.minimumWalletReservePercent ?? (wallets.jackpotCommon as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.jackpotCommon.minimumWalletReservePercent, fallback.wallets.jackpotCommon.minimumWalletReservePercent),
      payoutTiers: Array.isArray((wallets.jackpotCommon as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.jackpotCommon as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.jackpotCommon.payoutTiers,
    },
    jackpotRare: {
      ...fallback.wallets.jackpotRare,
      ...(wallets.jackpotRare && typeof wallets.jackpotRare === "object" ? wallets.jackpotRare : {}),
      allocationPercent: clampPercent((wallets.jackpotRare as { allocationPercent?: number } | undefined)?.allocationPercent ?? fallback.wallets.jackpotRare.allocationPercent, fallback.wallets.jackpotRare.allocationPercent),
      activationChancePercent: clampPercent((wallets.jackpotRare as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.activationChancePercent ?? (wallets.jackpotRare as { activationChancePercent?: number; rewardProbabilityPercent?: number } | undefined)?.rewardProbabilityPercent ?? fallback.wallets.jackpotRare.activationChancePercent, fallback.wallets.jackpotRare.activationChancePercent),
      minimumWalletReservePercent: clampPercent((wallets.jackpotRare as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.minimumWalletReservePercent ?? (wallets.jackpotRare as { minimumWalletReservePercent?: number; safetyBufferPercent?: number } | undefined)?.safetyBufferPercent ?? fallback.wallets.jackpotRare.minimumWalletReservePercent, fallback.wallets.jackpotRare.minimumWalletReservePercent),
      payoutTiers: Array.isArray((wallets.jackpotRare as { payoutTiers?: ChestWalletPayoutTier[] } | undefined)?.payoutTiers)
        ? ((wallets.jackpotRare as { payoutTiers?: ChestWalletPayoutTier[] }).payoutTiers ?? []).filter((tier): tier is ChestWalletPayoutTier => Boolean(tier) && typeof tier === "object")
        : fallback.wallets.jackpotRare.payoutTiers,
    },
  } as Record<ChestWalletKey, ChestWalletConfig>;

  const totalAllocation = Object.values(normalizedWallets).reduce((sum, wallet) => sum + wallet.allocationPercent, 0);
  if (Math.abs(totalAllocation - 100) > 0.01) {
    normalizedWallets.normal.allocationPercent = 70;
    normalizedWallets.jackpotCommon.allocationPercent = 25;
    normalizedWallets.jackpotRare.allocationPercent = 5;
  }

  return {
    schemaVersion: CHEST_WALLET_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: clampNonNegative(parsed.updatedAtMs ?? Date.now()),
    useUsdAsBaseCurrency: parsed.useUsdAsBaseCurrency ?? true,
    wallets: normalizedWallets,
  };
}

export function sanitizeChestWalletEconomyState(source: unknown): ChestWalletEconomyState {
  const fallback = buildDefaultChestWalletEconomyState();
  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<ChestWalletEconomyState> & { wallets?: Record<string, unknown>; ledger?: Array<Record<string, unknown>> };
  const wallets = parsed.wallets && typeof parsed.wallets === "object" ? parsed.wallets : fallback.wallets;

  const normalizedWallets = {
    normal: {
      balanceUsd: Number((wallets.normal as { balanceUsd?: number } | undefined)?.balanceUsd ?? 0),
      totalReceivedUsd: Number((wallets.normal as { totalReceivedUsd?: number } | undefined)?.totalReceivedUsd ?? 0),
      totalDistributedUsd: Number((wallets.normal as { totalDistributedUsd?: number } | undefined)?.totalDistributedUsd ?? 0),
      rewardCount: Number((wallets.normal as { rewardCount?: number } | undefined)?.rewardCount ?? 0),
      lastMovementAtMs: Number((wallets.normal as { lastMovementAtMs?: number } | undefined)?.lastMovementAtMs ?? Date.now()),
    },
    jackpotCommon: {
      balanceUsd: Number((wallets.jackpotCommon as { balanceUsd?: number } | undefined)?.balanceUsd ?? 0),
      totalReceivedUsd: Number((wallets.jackpotCommon as { totalReceivedUsd?: number } | undefined)?.totalReceivedUsd ?? 0),
      totalDistributedUsd: Number((wallets.jackpotCommon as { totalDistributedUsd?: number } | undefined)?.totalDistributedUsd ?? 0),
      rewardCount: Number((wallets.jackpotCommon as { rewardCount?: number } | undefined)?.rewardCount ?? 0),
      lastMovementAtMs: Number((wallets.jackpotCommon as { lastMovementAtMs?: number } | undefined)?.lastMovementAtMs ?? Date.now()),
    },
    jackpotRare: {
      balanceUsd: Number((wallets.jackpotRare as { balanceUsd?: number } | undefined)?.balanceUsd ?? 0),
      totalReceivedUsd: Number((wallets.jackpotRare as { totalReceivedUsd?: number } | undefined)?.totalReceivedUsd ?? 0),
      totalDistributedUsd: Number((wallets.jackpotRare as { totalDistributedUsd?: number } | undefined)?.totalDistributedUsd ?? 0),
      rewardCount: Number((wallets.jackpotRare as { rewardCount?: number } | undefined)?.rewardCount ?? 0),
      lastMovementAtMs: Number((wallets.jackpotRare as { lastMovementAtMs?: number } | undefined)?.lastMovementAtMs ?? Date.now()),
    },
  } as ChestWalletEconomyState["wallets"];

  const ledger = Array.isArray(parsed.ledger)
    ? parsed.ledger.map((entry) => {
        const raw = entry as Partial<ChestWalletLedgerEntry> & Record<string, unknown>;
        const walletId = (raw.walletId as ChestWalletKey | undefined) ?? (raw.walletKey as ChestWalletKey | undefined) ?? "normal";
        const type = (raw.type as ChestWalletLedgerEntry["type"] | undefined) ?? (raw.movementType as ChestWalletLedgerEntry["type"] | undefined) ?? "adjustment";
        const amountUsd = Number(raw.amountUsd ?? 0);
        const balanceBeforeUsd = Number(raw.balanceBeforeUsd ?? 0);
        const balanceAfterUsd = Number(raw.balanceAfterUsd ?? 0);
        const createdAt = String(raw.createdAt ?? raw.createdAtMs ?? Date.now());
        const description = String(raw.description ?? raw.source ?? "Wallet movement");

        return {
          id: String(raw.id ?? `entry-${Date.now()}-${Math.random()}`),
          walletId,
          type,
          amountUsd,
          balanceBeforeUsd,
          balanceAfterUsd,
          orderId: raw.orderId ? String(raw.orderId) : undefined,
          rewardId: raw.rewardId ? String(raw.rewardId) : undefined,
          userId: raw.userId ? String(raw.userId) : undefined,
          description,
          createdAt,
          source: raw.source ? String(raw.source) : undefined,
          referenceId: raw.referenceId ? String(raw.referenceId) : undefined,
          createdAtMs: raw.createdAtMs ? Number(raw.createdAtMs) : undefined,
          metadata: typeof raw.metadata === "object" && raw.metadata ? (raw.metadata as Record<string, unknown>) : undefined,
        } satisfies ChestWalletLedgerEntry;
      })
    : [];

  return {
    wallets: normalizedWallets,
    ledger,
    updatedAtMs: Number(parsed.updatedAtMs ?? Date.now()),
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
      id: `funding-${walletKey}-${Date.now()}-${nextState.ledger.length}`,
      walletId: walletKey,
      type: "funding",
      amountUsd,
      balanceBeforeUsd: roundUsd(wallet.balanceUsd - amountUsd),
      balanceAfterUsd: roundUsd(wallet.balanceUsd),
      description: `Cashback funding for ${walletConfig.label}`,
      createdAt: new Date().toISOString(),
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
  const randomPercent = clampPercent(randomValue, 0);
  const walletEntries = Object.values(config.wallets).filter((walletConfig) => walletConfig.activationChancePercent > 0 && state.wallets[walletConfig.id].balanceUsd > 0);
  const totalActivationWeight = walletEntries.reduce((sum, walletConfig) => sum + walletConfig.activationChancePercent, 0);

  if (walletEntries.length === 0 || totalActivationWeight <= 0) {
    return null;
  }

  const threshold = (randomPercent / 100) * totalActivationWeight;
  let cumulative = 0;

  for (const walletConfig of walletEntries) {
    cumulative += walletConfig.activationChancePercent;
    if (threshold <= cumulative) {
      const walletState = state.wallets[walletConfig.id];
      const reserveAmount = roundUsd(walletState.balanceUsd * (walletConfig.minimumWalletReservePercent / 100));
      const maxPayoutUsd = roundUsd(Math.max(0, walletState.balanceUsd - reserveAmount));
      if (maxPayoutUsd <= 0) {
        return null;
      }

      const percentOfWallet = resolveTierPayoutPercent(walletConfig, randomPercent);
      const payoutUsd = roundUsd(Math.min(walletState.balanceUsd * (percentOfWallet / 100), maxPayoutUsd));
      if (payoutUsd <= 0) {
        return null;
      }

      return {
        walletKey: walletConfig.id,
        type: walletConfig.id === "normal" ? "normal" : walletConfig.id === "jackpotCommon" ? "jackpot-common" : "jackpot-rare",
        amountUsd: payoutUsd,
        percentOfWallet,
        reason: walletConfig.id === "normal" ? "normal-reward" : walletConfig.id === "jackpotCommon" ? "jackpot-common" : "jackpot-rare",
      };
    }
  }

  const fallbackWallet = walletEntries[walletEntries.length - 1];
  if (!fallbackWallet) {
    return null;
  }

  const walletState = state.wallets[fallbackWallet.id];
  const reserveAmount = roundUsd(walletState.balanceUsd * (fallbackWallet.minimumWalletReservePercent / 100));
  const maxPayoutUsd = roundUsd(Math.max(0, walletState.balanceUsd - reserveAmount));
  if (maxPayoutUsd <= 0) {
    return null;
  }

  const percentOfWallet = resolveTierPayoutPercent(fallbackWallet, randomPercent);
  const payoutUsd = roundUsd(Math.min(walletState.balanceUsd * (percentOfWallet / 100), maxPayoutUsd));
  if (payoutUsd <= 0) {
    return null;
  }

  return {
    walletKey: fallbackWallet.id,
    type: fallbackWallet.id === "normal" ? "normal" : fallbackWallet.id === "jackpotCommon" ? "jackpot-common" : "jackpot-rare",
    amountUsd: payoutUsd,
    percentOfWallet,
    reason: fallbackWallet.id === "normal" ? "normal-reward" : fallbackWallet.id === "jackpotCommon" ? "jackpot-common" : "jackpot-rare",
  };
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
    walletId: reward.walletKey,
    type: reward.type === "normal" ? "reward" : "jackpot",
    amountUsd: roundUsd(reward.amountUsd),
    balanceBeforeUsd: roundUsd(previousBalance),
    balanceAfterUsd: roundUsd(nextBalance),
    description: reward.type === "normal" ? "Chest reward payout" : `Jackpot payout for ${reward.walletKey}`,
    createdAt: new Date().toISOString(),
    source: reward.type === "normal" ? "chest" : "jackpot",
    referenceId: reward.type,
    createdAtMs: Date.now(),
    metadata: { percentOfWallet: reward.percentOfWallet, reason: reward.reason },
  });

  nextState.updatedAtMs = Date.now();
  return nextState;
}
