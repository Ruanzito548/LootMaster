import { CHEST_EXPECTED_VALUE_USD } from "./chest-loot";
import { type ChestId } from "./chests";

export type ChestEconomyPoolKey = "normal" | "jackpot20x" | "jackpot200x";

export type ChestEconomyConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  normalRewardPercent: number;
  jackpot20xPercent: number;
  jackpot200xPercent: number;
  jackpot20xChancePercent: number;
  jackpot200xChancePercent: number;
  jackpot20xMultiplier: number;
  jackpot200xMultiplier: number;
};

export type ChestEconomyState = {
  normalBalanceCents: number;
  jackpot20xBalanceCents: number;
  jackpot200xBalanceCents: number;
  totalFundedCents: number;
  totalDistributedCents: number;
  totalJackpotAwardsCents: number;
  updatedAtMs: number;
};

export type ChestEconomyReward = {
  poolKey: ChestEconomyPoolKey;
  amountCents: number;
  multiplier: number;
  reason: string;
};

export const CHEST_ECONOMY_SCHEMA_VERSION = 1;
const DEFAULT_NORMAL_REWARD_PERCENT = 5;
const DEFAULT_JACKPOT_20X_PERCENT = 1;
const DEFAULT_JACKPOT_200X_PERCENT = 1;
const DEFAULT_JACKPOT_20X_CHANCE_PERCENT = 2;
const DEFAULT_JACKPOT_200X_CHANCE_PERCENT = 0.5;
const DEFAULT_JACKPOT_20X_MULTIPLIER = 20;
const DEFAULT_JACKPOT_200X_MULTIPLIER = 200;

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function buildDefaultChestEconomyConfig(): ChestEconomyConfig {
  return {
    schemaVersion: CHEST_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: Date.now(),
    normalRewardPercent: DEFAULT_NORMAL_REWARD_PERCENT,
    jackpot20xPercent: DEFAULT_JACKPOT_20X_PERCENT,
    jackpot200xPercent: DEFAULT_JACKPOT_200X_PERCENT,
    jackpot20xChancePercent: DEFAULT_JACKPOT_20X_CHANCE_PERCENT,
    jackpot200xChancePercent: DEFAULT_JACKPOT_200X_CHANCE_PERCENT,
    jackpot20xMultiplier: DEFAULT_JACKPOT_20X_MULTIPLIER,
    jackpot200xMultiplier: DEFAULT_JACKPOT_200X_MULTIPLIER,
  };
}

export function sanitizeChestEconomyConfig(source: unknown): ChestEconomyConfig {
  const fallback = buildDefaultChestEconomyConfig();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<ChestEconomyConfig>;

  return {
    schemaVersion: CHEST_ECONOMY_SCHEMA_VERSION,
    updatedAtMs: clampNonNegative(parsed.updatedAtMs ?? Date.now()),
    normalRewardPercent: clampPercent(parsed.normalRewardPercent ?? fallback.normalRewardPercent, fallback.normalRewardPercent),
    jackpot20xPercent: clampPercent(parsed.jackpot20xPercent ?? fallback.jackpot20xPercent, fallback.jackpot20xPercent),
    jackpot200xPercent: clampPercent(parsed.jackpot200xPercent ?? fallback.jackpot200xPercent, fallback.jackpot200xPercent),
    jackpot20xChancePercent: clampPercent(parsed.jackpot20xChancePercent ?? fallback.jackpot20xChancePercent, fallback.jackpot20xChancePercent),
    jackpot200xChancePercent: clampPercent(parsed.jackpot200xChancePercent ?? fallback.jackpot200xChancePercent, fallback.jackpot200xChancePercent),
    jackpot20xMultiplier: Math.max(1, Math.round(parsed.jackpot20xMultiplier ?? fallback.jackpot20xMultiplier)),
    jackpot200xMultiplier: Math.max(1, Math.round(parsed.jackpot200xMultiplier ?? fallback.jackpot200xMultiplier)),
  };
}

export function buildDefaultChestEconomyState(): ChestEconomyState {
  return {
    normalBalanceCents: 0,
    jackpot20xBalanceCents: 0,
    jackpot200xBalanceCents: 0,
    totalFundedCents: 0,
    totalDistributedCents: 0,
    totalJackpotAwardsCents: 0,
    updatedAtMs: Date.now(),
  };
}

export function sanitizeChestEconomyState(source: unknown): ChestEconomyState {
  const fallback = buildDefaultChestEconomyState();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<ChestEconomyState>;

  return {
    normalBalanceCents: clampNonNegative(parsed.normalBalanceCents ?? fallback.normalBalanceCents),
    jackpot20xBalanceCents: clampNonNegative(parsed.jackpot20xBalanceCents ?? fallback.jackpot20xBalanceCents),
    jackpot200xBalanceCents: clampNonNegative(parsed.jackpot200xBalanceCents ?? fallback.jackpot200xBalanceCents),
    totalFundedCents: clampNonNegative(parsed.totalFundedCents ?? fallback.totalFundedCents),
    totalDistributedCents: clampNonNegative(parsed.totalDistributedCents ?? fallback.totalDistributedCents),
    totalJackpotAwardsCents: clampNonNegative(parsed.totalJackpotAwardsCents ?? fallback.totalJackpotAwardsCents),
    updatedAtMs: clampNonNegative(parsed.updatedAtMs ?? fallback.updatedAtMs),
  };
}

export function fundChestEconomyPools(
  state: ChestEconomyState,
  cashbackCents: number,
  config: ChestEconomyConfig,
): ChestEconomyState {
  const normalFunding = Math.round(cashbackCents * (config.normalRewardPercent / 100));
  const jackpot20xFunding = Math.round(cashbackCents * (config.jackpot20xPercent / 100));
  const jackpot200xFunding = Math.round(cashbackCents * (config.jackpot200xPercent / 100));

  return {
    ...state,
    normalBalanceCents: state.normalBalanceCents + normalFunding,
    jackpot20xBalanceCents: state.jackpot20xBalanceCents + jackpot20xFunding,
    jackpot200xBalanceCents: state.jackpot200xBalanceCents + jackpot200xFunding,
    totalFundedCents: state.totalFundedCents + normalFunding + jackpot20xFunding + jackpot200xFunding,
    updatedAtMs: Date.now(),
  };
}

export function resolveChestEconomyReward(
  chestId: ChestId,
  config: ChestEconomyConfig,
  state: ChestEconomyState,
  randomValue: number,
): ChestEconomyReward | null {
  const baseRewardCents = Math.max(1, Math.round((CHEST_EXPECTED_VALUE_USD[chestId] ?? 1) * 100));
  const normalRewardCents = Math.max(1, Math.round(baseRewardCents * (config.normalRewardPercent / 100)));

  if (state.normalBalanceCents <= 0 && state.jackpot20xBalanceCents <= 0 && state.jackpot200xBalanceCents <= 0) {
    return null;
  }

  const jackpot20xChance = clampPercent(config.jackpot20xChancePercent, DEFAULT_JACKPOT_20X_CHANCE_PERCENT);
  const jackpot200xChance = clampPercent(config.jackpot200xChancePercent, DEFAULT_JACKPOT_200X_CHANCE_PERCENT);

  const randomPercent = clampPercent(randomValue, 0);

  if (state.jackpot200xBalanceCents > 0 && randomPercent <= jackpot200xChance) {
    return {
      poolKey: "jackpot200x",
      amountCents: Math.max(1, Math.round(baseRewardCents * config.jackpot200xMultiplier)),
      multiplier: config.jackpot200xMultiplier,
      reason: "jackpot-200x",
    };
  }

  if (state.jackpot20xBalanceCents > 0 && randomPercent <= jackpot20xChance) {
    return {
      poolKey: "jackpot20x",
      amountCents: Math.max(1, Math.round(baseRewardCents * config.jackpot20xMultiplier)),
      multiplier: config.jackpot20xMultiplier,
      reason: "jackpot-20x",
    };
  }

  if (state.normalBalanceCents > 0) {
    return {
      poolKey: "normal",
      amountCents: normalRewardCents,
      multiplier: 1,
      reason: "normal-reward",
    };
  }

  return null;
}

export function applyChestEconomyReward(
  state: ChestEconomyState,
  reward: ChestEconomyReward,
): ChestEconomyState {
  const nextState = { ...state };

  if (reward.poolKey === "normal") {
    nextState.normalBalanceCents = Math.max(0, nextState.normalBalanceCents - reward.amountCents);
  } else if (reward.poolKey === "jackpot20x") {
    nextState.jackpot20xBalanceCents = Math.max(0, nextState.jackpot20xBalanceCents - reward.amountCents);
  } else if (reward.poolKey === "jackpot200x") {
    nextState.jackpot200xBalanceCents = Math.max(0, nextState.jackpot200xBalanceCents - reward.amountCents);
  }

  nextState.totalDistributedCents = nextState.totalDistributedCents + reward.amountCents;
  nextState.totalJackpotAwardsCents =
    reward.poolKey === "normal" ? nextState.totalJackpotAwardsCents : nextState.totalJackpotAwardsCents + reward.amountCents;
  nextState.updatedAtMs = Date.now();

  return nextState;
}
