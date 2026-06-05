import type { InventoryItem } from "./profile-data";

export const LEVEL_XP_CENTS = 25_000;

export type RewardKind = "chest" | "key" | "coupon";

export type LevelProgress = {
  level: number;
  totalSpentCents: number;
  totalSpentUsd: number;
  xpCents: number;
  nextLevelXpCents: number;
  progressPercent: number;
  spendToNextLevelCents: number;
  nextLevel: number;
};

export type LevelRewardPreview = {
  level: number;
  kind: RewardKind;
  title: string;
  description: string;
  badge: string;
  inventoryItem: InventoryItem;
  couponPercent?: number;
};

function normalizeCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value);
}

export function formatMoneyUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateLevelProgress(totalSpentCents: number): LevelProgress {
  const normalizedTotalSpentCents = normalizeCents(totalSpentCents);
  const level = Math.floor(normalizedTotalSpentCents / LEVEL_XP_CENTS) + 1;
  const xpCents = normalizedTotalSpentCents % LEVEL_XP_CENTS;

  return {
    level,
    totalSpentCents: normalizedTotalSpentCents,
    totalSpentUsd: normalizedTotalSpentCents / 100,
    xpCents,
    nextLevelXpCents: LEVEL_XP_CENTS,
    progressPercent: Math.min(100, Math.round((xpCents / LEVEL_XP_CENTS) * 1000) / 10),
    spendToNextLevelCents: LEVEL_XP_CENTS - xpCents,
    nextLevel: level + 1,
  };
}

function rewardKindForLevel(level: number): RewardKind {
  const offset = (level - 2) % 3;

  if (offset === 0) {
    return "chest";
  }

  if (offset === 1) {
    return "key";
  }

  return "coupon";
}

function chestTitleForLevel(level: number): string {
  const tiers = ["Bronze", "Silver", "Golden", "Mythic"];
  const tier = Math.max(0, Math.floor((level - 2) / 3));
  return `${tiers[tier % tiers.length] ?? "Vault"} Chest`;
}

function keyTitleForLevel(level: number): string {
  const titles = ["Vault Key", "Forge Key", "Storm Key", "Mythic Key"];
  const tier = Math.max(0, Math.floor((level - 3) / 3));
  return titles[tier % titles.length] ?? "Vault Key";
}

function couponPercentForLevel(level: number): number {
  const tier = Math.max(0, Math.floor((level - 4) / 3));
  return 10 + tier * 2;
}

export function buildLevelReward(level: number, sourceId = `level-${level}`): LevelRewardPreview {
  const kind = rewardKindForLevel(level);

  if (kind === "chest") {
    const title = chestTitleForLevel(level);

    return {
      level,
      kind,
      title,
      badge: "Chest",
      description: `A reward chest unlocked at level ${level}.`,
      inventoryItem: {
        id: `reward-${sourceId}-chest-${level}`,
        name: title,
        category: "Reward",
        description: `Openable chest granted for reaching level ${level}.`,
        quantity: 1,
        rarity: level >= 8 ? "epic" : level >= 5 ? "rare" : "common",
        iconPath: "/itens/general/ticket.png",
      },
    };
  }

  if (kind === "key") {
    const title = keyTitleForLevel(level);

    return {
      level,
      kind,
      title,
      badge: "Key",
      description: `A key reward that keeps your account opening new vaults.`,
      inventoryItem: {
        id: `reward-${sourceId}-key-${level}`,
        name: title,
        category: "Reward",
        description: `Key granted for reaching level ${level}.`,
        quantity: 1,
        rarity: level >= 9 ? "epic" : "uncommon",
        iconPath: "/itens/general/ticket.png",
      },
    };
  }

  const couponPercent = couponPercentForLevel(level);
  const title = `${couponPercent}% Discount Coupon`;

  return {
    level,
    kind,
    title,
    badge: "Coupon",
    couponPercent,
    description: `Use this coupon on your next checkout to unlock a ${couponPercent}% discount.`,
    inventoryItem: {
      id: `reward-${sourceId}-coupon-${level}`,
      name: title,
      category: "Reward",
      description: `Discount coupon granted for reaching level ${level}.`,
      quantity: 1,
      rarity: level >= 7 ? "epic" : "rare",
      iconPath: "/itens/general/ticket.png",
    },
  };
}

export function buildLevelRewards(startLevel: number, endLevel: number, sourceId = "level-up"): LevelRewardPreview[] {
  const rewards: LevelRewardPreview[] = [];

  for (let level = Math.max(2, startLevel); level <= endLevel; level += 1) {
    rewards.push(buildLevelReward(level, `${sourceId}-${level}`));
  }

  return rewards;
}
