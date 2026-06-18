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
  fullGiftCard: {
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

const CHEST_CONFIG_SCHEMA_VERSION = 2;

const VALID_REWARD_TYPES: ChestRewardType[] = ["coins", "item"];

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
      { type: "coins", weight: 100 },
    ],
    rare: [
      { type: "coins", weight: 72 },
      { type: "item", weight: 28 },
    ],
    epic: [
      { type: "coins", weight: 64 },
      { type: "item", weight: 36 },
    ],
    legendary: [
      { type: "coins", weight: 58 },
      { type: "item", weight: 42 },
    ],
    mythic: [
      { type: "coins", weight: 52 },
      { type: "item", weight: 48 },
    ],
  };

  const fragmentByChest: Record<ChestId, ChestDropProfile["giftCardFragment"]> = {
    common: { chancePercent: 0, min: 0, max: 0 },
    rare: { chancePercent: 100, min: 1, max: 1 },
    epic: { chancePercent: 100, min: 1, max: 3 },
    legendary: { chancePercent: 0, min: 0, max: 0 },
    mythic: { chancePercent: 0, min: 0, max: 0 },
  };

  const fullGiftCardByChest: Record<ChestId, ChestDropProfile["fullGiftCard"]> = {
    common: { chancePercent: 0, min: 0, max: 0 },
    rare: { chancePercent: 0, min: 0, max: 0 },
    epic: { chancePercent: 0, min: 0, max: 0 },
    legendary: { chancePercent: 100, min: 1, max: 1 },
    mythic: { chancePercent: 100, min: 2, max: 2 },
  };

  const accountByChest: Record<ChestId, ChestDropProfile["accountDrop"]> = {
    common: { enabled: false, chancePercent: 0 },
    rare: { enabled: false, chancePercent: 0 },
    epic: { enabled: false, chancePercent: 0 },
    legendary: { enabled: false, chancePercent: 0 },
    mythic: { enabled: true, chancePercent: 2 },
  };

  const coinRangeByChest: Record<ChestId, { min: number; max: number }> = {
    common: { min: 0, max: 1 },
    rare: { min: 0, max: 3 },
    epic: { min: 0, max: 10 },
    legendary: { min: 0, max: 25 },
    mythic: { min: 0, max: 50 },
  };

  return {
    rewardOdds: rewardOddsByChest[definition.id],
    coinRange: coinRangeByChest[definition.id],
    itemRarityWeights: definition.itemRarityWeights,
    xpGain: defaultXpGain(definition.id),
    giftCardFragment: fragmentByChest[definition.id],
    fullGiftCard: fullGiftCardByChest[definition.id],
    accountDrop: accountByChest[definition.id],
  };
}

export function buildDefaultChestSystemConfig(): ChestSystemConfig {
  const byChest = CHEST_IDS.reduce((acc, chestId) => {
    acc[chestId] = getDefaultProfile(CHEST_DEFINITIONS[chestId]);
    return acc;
  }, {} as Record<ChestId, ChestDropProfile>);

  return {
    schemaVersion: CHEST_CONFIG_SCHEMA_VERSION,
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
  if (parsed.schemaVersion !== CHEST_CONFIG_SCHEMA_VERSION) {
    return fallback;
  }

  const parsedByChest = parsed.byChest && typeof parsed.byChest === "object" ? parsed.byChest : null;

  const byChest = CHEST_IDS.reduce((acc, chestId) => {
    const fallbackProfile = fallback.byChest[chestId];
    const raw = parsedByChest ? (parsedByChest as Record<string, unknown>)[chestId] : null;

    if (!raw || typeof raw !== "object") {
      acc[chestId] = fallbackProfile;
      return acc;
    }

    const profile = raw as Partial<ChestDropProfile>;

    const minCoins = asBoundedInt(profile.coinRange?.min, fallbackProfile.coinRange.min, 0, 1000000);
    const maxCoins = asBoundedInt(profile.coinRange?.max, fallbackProfile.coinRange.max, minCoins, 1000000);

    const fragmentChance = asBoundedInt(profile.giftCardFragment?.chancePercent, fallbackProfile.giftCardFragment.chancePercent, 0, 100);
    const fragmentMin = asBoundedInt(profile.giftCardFragment?.min, fallbackProfile.giftCardFragment.min, 0, 1000);
    const fragmentMax = asBoundedInt(profile.giftCardFragment?.max, fallbackProfile.giftCardFragment.max, fragmentMin, 1000);

    const fullGiftCardChance = asBoundedInt(profile.fullGiftCard?.chancePercent, fallbackProfile.fullGiftCard.chancePercent, 0, 100);
    const fullGiftCardMin = asBoundedInt(profile.fullGiftCard?.min, fallbackProfile.fullGiftCard.min, 0, 1000);
    const fullGiftCardMax = asBoundedInt(profile.fullGiftCard?.max, fallbackProfile.fullGiftCard.max, fullGiftCardMin, 1000);

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
      fullGiftCard: {
        chancePercent: fullGiftCardChance,
        min: fullGiftCardMin,
        max: fullGiftCardMax,
      },
      accountDrop: {
        enabled: Boolean(profile.accountDrop?.enabled),
        chancePercent: asBoundedInt(profile.accountDrop?.chancePercent, fallbackProfile.accountDrop.chancePercent, 0, 100),
      },
    };

    return acc;
  }, {} as Record<ChestId, ChestDropProfile>);

  return {
    schemaVersion: CHEST_CONFIG_SCHEMA_VERSION,
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
