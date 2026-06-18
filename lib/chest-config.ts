import { getAdminDb } from "@/lib/firebase-admin";
import { CHEST_DEFINITIONS, CHEST_IDS, type ChestDefinition, type ChestId, type ChestRewardOddsEntry, type ChestRewardType } from "@/lib/chests";
import type { InventoryItem } from "@/lib/profile-data";

type ItemRarityWeight = {
  rarity: InventoryItem["rarity"];
  weight: number;
};

export type ChestDropProfile = {
  rewardOdds: ChestRewardOddsEntry[];
  coinRange: {
    min: number;
    max: number;
  };
  itemRarityWeights: ItemRarityWeight[];
  xpGain: number;
  giftCardFragment: {
    chancePercent: number;
    min: number;
    max: number;
  };
  accountDrop: {
    enabled: boolean;
    chancePercent: number;
  };
};

export type ChestSystemConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  byChest: Record<ChestId, ChestDropProfile>;
};

const VALID_REWARD_TYPES: ChestRewardType[] = ["coins", "item", "chest", "cosmetic"];

const VALID_INVENTORY_RARITIES: InventoryItem["rarity"][] = [
  "poor",
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "artifact",
  "heirloom",
];

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function asBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizeRewardOdds(value: unknown, fallback: ChestRewardOddsEntry[]): ChestRewardOddsEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const parsed = entry as Partial<ChestRewardOddsEntry>;
      if (!parsed.type || !VALID_REWARD_TYPES.includes(parsed.type)) {
        return null;
      }

      const weight = asBoundedInt(parsed.weight, 0, 0, 1000);
      return { type: parsed.type, weight };
    })
    .filter((entry): entry is ChestRewardOddsEntry => Boolean(entry));

  if (normalized.length === 0) {
    return fallback;
  }

  const weightTotal = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (weightTotal <= 0) {
    return fallback;
  }

  return normalized;
}

function normalizeItemRarityWeights(value: unknown, fallback: ItemRarityWeight[]): ItemRarityWeight[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const parsed = entry as Partial<ItemRarityWeight>;
      if (!parsed.rarity || !VALID_INVENTORY_RARITIES.includes(parsed.rarity)) {
        return null;
      }

      return {
        rarity: parsed.rarity,
        weight: asBoundedInt(parsed.weight, 0, 0, 1000),
      };
    })
    .filter((entry): entry is ItemRarityWeight => Boolean(entry));

  if (normalized.length === 0) {
    return fallback;
  }

  const total = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return fallback;
  }

  return normalized;
}

function defaultXpGain(chestId: ChestId): number {
  if (chestId === "mythic") {
    return 52;
  }

  if (chestId === "legendary") {
    return 34;
  }

  if (chestId === "epic") {
    return 22;
  }

  if (chestId === "rare") {
    return 14;
  }

  return 9;
}

function getDefaultProfile(definition: ChestDefinition): ChestDropProfile {
  const rewardOddsByChest: Record<ChestId, ChestRewardOddsEntry[]> = {
    common: [
      { type: "coins", weight: 70 },
      { type: "item", weight: 23 },
      { type: "chest", weight: 5 },
      { type: "cosmetic", weight: 2 },
    ],
    rare: [
      { type: "coins", weight: 55 },
      { type: "item", weight: 30 },
      { type: "chest", weight: 10 },
      { type: "cosmetic", weight: 5 },
    ],
    epic: [
      { type: "coins", weight: 40 },
      { type: "item", weight: 35 },
      { type: "chest", weight: 15 },
      { type: "cosmetic", weight: 10 },
    ],
    legendary: [
      { type: "coins", weight: 28 },
      { type: "item", weight: 33 },
      { type: "chest", weight: 22 },
      { type: "cosmetic", weight: 17 },
    ],
    mythic: [
      { type: "coins", weight: 18 },
      { type: "item", weight: 32 },
      { type: "chest", weight: 24 },
      { type: "cosmetic", weight: 26 },
    ],
  };

  const fragmentByChest: Record<ChestId, ChestDropProfile["giftCardFragment"]> = {
    common: { chancePercent: 18, min: 1, max: 2 },
    rare: { chancePercent: 28, min: 1, max: 3 },
    epic: { chancePercent: 38, min: 2, max: 4 },
    legendary: { chancePercent: 52, min: 3, max: 6 },
    mythic: { chancePercent: 70, min: 5, max: 9 },
  };

  const accountByChest: Record<ChestId, ChestDropProfile["accountDrop"]> = {
    common: { enabled: false, chancePercent: 0 },
    rare: { enabled: false, chancePercent: 0 },
    epic: { enabled: false, chancePercent: 0 },
    legendary: { enabled: true, chancePercent: 7 },
    mythic: { enabled: true, chancePercent: 12 },
  };

  return {
    rewardOdds: rewardOddsByChest[definition.id],
    coinRange: {
      min: definition.coinRange.min,
      max: definition.coinRange.max,
    },
    itemRarityWeights: definition.itemRarityWeights,
    xpGain: defaultXpGain(definition.id),
    giftCardFragment: fragmentByChest[definition.id],
    accountDrop: accountByChest[definition.id],
  };
}

export function buildDefaultChestSystemConfig(): ChestSystemConfig {
  const byChest = CHEST_IDS.reduce((acc, chestId) => {
    acc[chestId] = getDefaultProfile(CHEST_DEFINITIONS[chestId]);
    return acc;
  }, {} as Record<ChestId, ChestDropProfile>);

  return {
    schemaVersion: 1,
    updatedAtMs: Date.now(),
    byChest,
  };
}

export function sanitizeChestSystemConfig(source: unknown): ChestSystemConfig {
  const fallback = buildDefaultChestSystemConfig();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<ChestSystemConfig>;
  const parsedByChest = parsed.byChest && typeof parsed.byChest === "object" ? parsed.byChest : null;

  const byChest = CHEST_IDS.reduce((acc, chestId) => {
    const fallbackProfile = fallback.byChest[chestId];
    const raw = parsedByChest ? (parsedByChest as Record<string, unknown>)[chestId] : null;

    if (!raw || typeof raw !== "object") {
      acc[chestId] = fallbackProfile;
      return acc;
    }

    const profile = raw as Partial<ChestDropProfile>;

    const minCoins = asBoundedInt(profile.coinRange?.min, fallbackProfile.coinRange.min, 1, 1000000);
    const maxCoins = asBoundedInt(profile.coinRange?.max, fallbackProfile.coinRange.max, minCoins, 1000000);

    const fragmentChance = asBoundedInt(profile.giftCardFragment?.chancePercent, fallbackProfile.giftCardFragment.chancePercent, 0, 100);
    const fragmentMin = asBoundedInt(profile.giftCardFragment?.min, fallbackProfile.giftCardFragment.min, 1, 1000);
    const fragmentMax = asBoundedInt(profile.giftCardFragment?.max, fallbackProfile.giftCardFragment.max, fragmentMin, 1000);

    acc[chestId] = {
      rewardOdds: normalizeRewardOdds(profile.rewardOdds, fallbackProfile.rewardOdds),
      coinRange: {
        min: minCoins,
        max: maxCoins,
      },
      itemRarityWeights: normalizeItemRarityWeights(profile.itemRarityWeights, fallbackProfile.itemRarityWeights),
      xpGain: asBoundedInt(profile.xpGain, fallbackProfile.xpGain, 0, 2000),
      giftCardFragment: {
        chancePercent: fragmentChance,
        min: fragmentMin,
        max: fragmentMax,
      },
      accountDrop: {
        enabled: Boolean(profile.accountDrop?.enabled),
        chancePercent: asBoundedInt(profile.accountDrop?.chancePercent, fallbackProfile.accountDrop.chancePercent, 0, 100),
      },
    };

    return acc;
  }, {} as Record<ChestId, ChestDropProfile>);

  return {
    schemaVersion: asBoundedInt(parsed.schemaVersion, 1, 1, 100),
    updatedAtMs: asBoundedInt(parsed.updatedAtMs, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    byChest,
  };
}

export async function getLiveChestSystemConfig(): Promise<ChestSystemConfig> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("app-config").doc("chest-system").get();

  if (!snapshot.exists) {
    return buildDefaultChestSystemConfig();
  }

  return sanitizeChestSystemConfig(snapshot.data());
}
