import { getChestImagePath } from "./chests";
import type { InventoryItem } from "./profile-data";

export const XP_PER_USD = 1;
export const LEVEL_CAP = 20;

export type BattlePassChestId = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type RewardKind = "battle-pass-chest-bundle";

export type RewardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type UnlockState = "claimed" | "available" | "locked";

export type LevelProgress = {
  level: number;
  totalSpentCents: number;
  totalSpentUsd: number;
  totalXp: number;
  xpCents: number;
  nextLevelXpCents: number;
  progressPercent: number;
  xpToNextLevel: number;
  spendToNextLevelUsd: number;
  nextLevel: number;
};

export type LevelRewardPreview = {
  level: number;
  kind: RewardKind;
  rarity: RewardRarity;
  title: string;
  shortLabel: string;
  description: string;
  icon: string;
  badge: string;
  inventoryItem: InventoryItem;
  grantedItems: InventoryItem[];
  chestBundle: Partial<Record<BattlePassChestId, number>>;
};

export type RewardTrackNode = {
  level: number;
  state: UnlockState;
  reward: LevelRewardPreview;
  isMilestone: boolean;
  isPremium: boolean;
};

export type UnlockHistoryItem = {
  id: string;
  level: number;
  title: string;
  rarity: RewardRarity;
  icon: string;
  kind: RewardKind;
  unlockedAt: string;
};

const rarityToInventoryRarity: Record<RewardRarity, InventoryItem["rarity"]> = {
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
  mythic: "mythic",
};

const rarityBadgeLabel: Record<RewardRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

const CHEST_META: Record<BattlePassChestId, { icon: string; rarity: RewardRarity; label: string }> = {
  common: { icon: "🪙", rarity: "common", label: "Common Chest" },
  uncommon: { icon: "🟢", rarity: "uncommon", label: "Uncommon Chest" },
  rare: { icon: "🔵", rarity: "rare", label: "Rare Chest" },
  epic: { icon: "🟣", rarity: "epic", label: "Epic Chest" },
  legendary: { icon: "🟠", rarity: "legendary", label: "Legendary Chest" },
  mythic: { icon: "🔴", rarity: "mythic", label: "Mythic Chest" },
};

const XP_TO_LEVEL_UP: Record<number, number> = {
  2: 25,
  3: 50,
  4: 75,
  5: 100,
  6: 125,
  7: 150,
  8: 175,
  9: 200,
  10: 250,
  11: 300,
  12: 350,
  13: 400,
  14: 450,
  15: 500,
  16: 600,
  17: 700,
  18: 800,
  19: 900,
  20: 1000,
};

const BATTLE_PASS_REWARDS: Record<number, Partial<Record<BattlePassChestId, number>>> = {
  2: { common: 1 },
  3: { uncommon: 1 },
  4: { common: 1, uncommon: 1 },
  5: { rare: 1 },
  6: { rare: 1, common: 1 },
  7: { rare: 1, uncommon: 1 },
  8: { rare: 1, uncommon: 1, common: 1 },
  9: { epic: 1 },
  10: { epic: 1, rare: 1 },
  11: { epic: 1, rare: 1 },
  12: { epic: 1, rare: 1, uncommon: 1 },
  13: { legendary: 1 },
  14: { legendary: 1, uncommon: 1 },
  15: { legendary: 1, rare: 1 },
  16: { legendary: 1, epic: 1 },
  17: { legendary: 1, epic: 1, rare: 1 },
  18: { legendary: 2 },
  19: { legendary: 2, rare: 1 },
  20: { mythic: 1 },
};

function normalizeCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoneyUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateTotalXp(totalSpentCents: number): number {
  const usd = normalizeCents(totalSpentCents) / 100;
  return round2(usd * XP_PER_USD);
}

export function getXpThresholdForLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));

  let sum = 0;
  for (let target = 2; target <= normalizedLevel; target += 1) {
    sum += XP_TO_LEVEL_UP[target] ?? 0;
  }

  return sum;
}

export function getXpRequiredToNextLevel(currentLevel: number): number {
  const nextLevel = Math.min(LEVEL_CAP, Math.floor(currentLevel) + 1);
  return XP_TO_LEVEL_UP[nextLevel] ?? 0;
}

export function getLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));

  let level = 1;
  for (let candidate = 2; candidate <= LEVEL_CAP; candidate += 1) {
    if (xp >= getXpThresholdForLevel(candidate)) {
      level = candidate;
    } else {
      break;
    }
  }

  return level;
}

export function calculateLevelProgress(totalSpentCents: number): LevelProgress {
  const normalizedTotalSpentCents = normalizeCents(totalSpentCents);
  const totalSpentUsd = normalizedTotalSpentCents / 100;
  const totalXp = calculateTotalXp(normalizedTotalSpentCents);

  const level = getLevelFromXp(totalXp);
  const currentThreshold = getXpThresholdForLevel(level);
  const requiredToNext = getXpRequiredToNextLevel(level);
  const xpInside = round2(Math.max(0, totalXp - currentThreshold));
  const xpToNext = level >= LEVEL_CAP ? 0 : round2(Math.max(0, requiredToNext - xpInside));

  return {
    level,
    totalSpentCents: normalizedTotalSpentCents,
    totalSpentUsd,
    totalXp,
    xpCents: xpInside,
    nextLevelXpCents: requiredToNext,
    progressPercent: level >= LEVEL_CAP || requiredToNext <= 0 ? 100 : round2((xpInside / requiredToNext) * 100),
    xpToNextLevel: xpToNext,
    spendToNextLevelUsd: round2(xpToNext / XP_PER_USD),
    nextLevel: Math.min(LEVEL_CAP, level + 1),
  };
}

function mapChestToInventoryItem(chestId: BattlePassChestId, quantity: number): InventoryItem {
  const chestRarityMap: Record<BattlePassChestId, InventoryItem["rarity"]> = {
    common: "common",
    uncommon: "uncommon",
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
    mythic: "mythic",
  };

  return {
    id: `chest-${chestId}`,
    name: CHEST_META[chestId].label,
    category: "Chest",
    description: `${CHEST_META[chestId].label} unlocked from Battle Pass progression.`,
    quantity,
    rarity: chestRarityMap[chestId],
    iconPath: getChestImagePath(chestId),
  };
}

function getBundleRarity(bundle: Partial<Record<BattlePassChestId, number>>): RewardRarity {
  if (bundle.mythic) return "mythic";
  if (bundle.legendary) return "legendary";
  if (bundle.epic) return "epic";
  if (bundle.rare) return "rare";
  if (bundle.uncommon) return "uncommon";
  return "common";
}

function getBundleIcon(bundle: Partial<Record<BattlePassChestId, number>>): string {
  const rarity = getBundleRarity(bundle);
  if (rarity === "mythic") return "🔴";
  if (rarity === "legendary") return "🟠";
  if (rarity === "epic") return "🟣";
  if (rarity === "rare") return "🔵";
  if (rarity === "uncommon") return "🟢";
  return "⚪";
}

function getBundleTitle(level: number, bundle: Partial<Record<BattlePassChestId, number>>): string {
  const parts = (Object.keys(bundle) as BattlePassChestId[])
    .filter((id) => (bundle[id] ?? 0) > 0)
    .map((id) => `${bundle[id]}x ${CHEST_META[id].label}`);

  if (parts.length === 0) {
    return `Battle Pass Reward Lv.${level}`;
  }

  return parts.join(" + ");
}

function buildSummaryItem(level: number, rarity: RewardRarity): InventoryItem {
  return {
    id: `battle-pass-bundle-${level}`,
    name: `Battle Pass Bundle Lv.${level}`,
    category: "Reward",
    description: `Battle Pass reward bundle for level ${level}.`,
    quantity: 1,
    rarity: rarityToInventoryRarity[rarity],
    iconPath: "/itens/general/ticket.png",
  };
}

export function buildLevelReward(level: number, sourceId = `level-${level}`): LevelRewardPreview {
  const normalizedLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
  const chestBundle = BATTLE_PASS_REWARDS[normalizedLevel] ?? {};
  const grantedItems = (Object.keys(chestBundle) as BattlePassChestId[])
    .filter((chestId) => (chestBundle[chestId] ?? 0) > 0)
    .map((chestId) => mapChestToInventoryItem(chestId, chestBundle[chestId]!));

  const rarity = getBundleRarity(chestBundle);
  const title = getBundleTitle(normalizedLevel, chestBundle);

  return {
    level: normalizedLevel,
    kind: "battle-pass-chest-bundle",
    rarity,
    title,
    shortLabel: title,
    description: `Battle Pass reward unlocked at level ${normalizedLevel}. Source: ${sourceId}.`,
    icon: getBundleIcon(chestBundle),
    badge: rarityBadgeLabel[rarity],
    inventoryItem: buildSummaryItem(normalizedLevel, rarity),
    grantedItems,
    chestBundle,
  };
}

export function buildLevelRewards(startLevel: number, endLevel: number): LevelRewardPreview[] {
  const rewards: LevelRewardPreview[] = [];
  const safeStart = Math.max(2, Math.floor(startLevel));
  const safeEnd = Math.min(LEVEL_CAP, Math.max(safeStart, Math.floor(endLevel)));

  for (let level = safeStart; level <= safeEnd; level += 1) {
    rewards.push(buildLevelReward(level));
  }

  return rewards;
}

export function buildRewardTrack(level: number, highestRewardedLevel: number, size = 19): RewardTrackNode[] {
  const center = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
  const radius = Math.floor(size / 2);
  const start = Math.max(1, center - radius);
  const end = Math.min(LEVEL_CAP, start + size - 1);

  const nodes: RewardTrackNode[] = [];

  for (let itemLevel = start; itemLevel <= end; itemLevel += 1) {
    const reward = buildLevelReward(itemLevel);
    const state: UnlockState =
      itemLevel <= highestRewardedLevel
        ? "claimed"
        : itemLevel <= center
          ? "available"
          : "locked";

    nodes.push({
      level: itemLevel,
      reward,
      state,
      isMilestone: itemLevel === 10 || itemLevel === 15 || itemLevel === 20,
      isPremium: itemLevel === 10 || itemLevel === 15 || itemLevel === 20,
    });
  }

  return nodes;
}

export function buildUnlockHistoryItem(reward: LevelRewardPreview, sourceId: string, unlockedAt: string): UnlockHistoryItem {
  return {
    id: `unlock-${sourceId}-${reward.level}`,
    level: reward.level,
    title: reward.title,
    rarity: reward.rarity,
    icon: reward.icon,
    kind: reward.kind,
    unlockedAt,
  };
}
