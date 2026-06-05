import type { InventoryItem } from "./profile-data";

export const XP_PER_USD = 0.65;
export const LEVEL_XP_REQUIREMENT = 150;

export type RewardKind =
  | "loot-chest"
  | "vault-key"
  | "discount-coupon"
  | "xp-booster"
  | "marketplace-credits"
  | "exclusive-cosmetic"
  | "profile-badge"
  | "limited-banner"
  | "event-ticket"
  | "premium-spin"
  | "mystery-drop"
  | "epic-bundle"
  | "mythic-drop";

export type RewardRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type UnlockState = "claimed" | "current" | "locked";

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
  xpBoostPercent?: number;
  couponPercent?: number;
  creditAmount?: number;
  bonusDrop?: {
    kind: RewardKind;
    title: string;
    rarity: RewardRarity;
    icon: string;
  };
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
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
  mythic: "artifact",
};

const rarityBadgeLabel: Record<RewardRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

const smallRewards: Array<{
  kind: RewardKind;
  title: string;
  rarity: RewardRarity;
  icon: string;
  couponPercent?: number;
  xpBoostPercent?: number;
  creditAmount?: number;
}> = [
  { kind: "loot-chest", title: "Bronze Chest", rarity: "common", icon: "🧰" },
  { kind: "vault-key", title: "Vault Key", rarity: "rare", icon: "🗝️" },
  { kind: "discount-coupon", title: "5% Coupon", rarity: "rare", icon: "🎟️", couponPercent: 5 },
  { kind: "xp-booster", title: "XP Booster", rarity: "common", icon: "⚡", xpBoostPercent: 10 },
  { kind: "marketplace-credits", title: "Marketplace Credits", rarity: "rare", icon: "💠", creditAmount: 150 },
  { kind: "profile-badge", title: "Profile Badge", rarity: "epic", icon: "🛡️" },
  { kind: "event-ticket", title: "Event Ticket", rarity: "rare", icon: "🎫" },
  { kind: "premium-spin", title: "Premium Spin", rarity: "epic", icon: "🎰" },
  { kind: "limited-banner", title: "Limited Banner", rarity: "epic", icon: "🏳️" },
  { kind: "exclusive-cosmetic", title: "Exclusive Cosmetic", rarity: "legendary", icon: "✨" },
];

const milestoneRewards: Array<{ title: string; rarity: RewardRarity; icon: string }> = [
  { title: "Silver Chest", rarity: "epic", icon: "🎁" },
  { title: "Golden Chest", rarity: "legendary", icon: "👑" },
  { title: "Legendary Chest", rarity: "legendary", icon: "🧿" },
];

const premiumRewards: Array<{ title: string; rarity: RewardRarity; icon: string }> = [
  { title: "Epic Reward Bundle", rarity: "epic", icon: "📦" },
  { title: "Premium Core Bundle", rarity: "legendary", icon: "💎" },
  { title: "Season Prestige Bundle", rarity: "mythic", icon: "🔥" },
];

const rareDrops: Array<{ kind: RewardKind; title: string; rarity: RewardRarity; icon: string }> = [
  { kind: "mystery-drop", title: "Mystery Drop", rarity: "epic", icon: "🎲" },
  { kind: "event-ticket", title: "Event Ticket", rarity: "rare", icon: "🎫" },
  { kind: "premium-spin", title: "Premium Spin", rarity: "epic", icon: "🎰" },
];

function seeded(level: number, offset = 0): number {
  const value = Math.sin(level * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

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

export function calculateLevelProgress(totalSpentCents: number): LevelProgress {
  const normalizedTotalSpentCents = normalizeCents(totalSpentCents);
  const totalSpentUsd = normalizedTotalSpentCents / 100;
  const totalXp = calculateTotalXp(normalizedTotalSpentCents);
  const level = Math.floor(totalXp / LEVEL_XP_REQUIREMENT) + 1;
  const xpInsideLevel = round2(totalXp - Math.floor(totalXp / LEVEL_XP_REQUIREMENT) * LEVEL_XP_REQUIREMENT);
  const xpToNextLevel = round2(Math.max(0, LEVEL_XP_REQUIREMENT - xpInsideLevel));

  return {
    level,
    totalSpentCents: normalizedTotalSpentCents,
    totalSpentUsd,
    totalXp,
    xpCents: xpInsideLevel,
    nextLevelXpCents: LEVEL_XP_REQUIREMENT,
    progressPercent: Math.min(100, Math.max(0, round2((xpInsideLevel / LEVEL_XP_REQUIREMENT) * 100))),
    xpToNextLevel,
    spendToNextLevelUsd: round2(xpToNextLevel / XP_PER_USD),
    nextLevel: level + 1,
  };
}

function createInventoryItem(reward: LevelRewardPreview, sourceId: string): InventoryItem {
  return {
    id: `reward-${sourceId}-${reward.level}-${reward.kind}`,
    name: reward.title,
    category: "Reward",
    description: `${reward.badge} unlocked at level ${reward.level}.`,
    quantity: 1,
    rarity: rarityToInventoryRarity[reward.rarity],
    iconPath: "/itens/general/ticket.png",
  };
}

function buildRewardFromTemplate(
  level: number,
  kind: RewardKind,
  rarity: RewardRarity,
  title: string,
  icon: string,
  extras?: Pick<LevelRewardPreview, "couponPercent" | "xpBoostPercent" | "creditAmount">,
): Omit<LevelRewardPreview, "inventoryItem"> {
  return {
    level,
    kind,
    rarity,
    title,
    shortLabel: title,
    description: `${title} unlocked at level ${level}.`,
    icon,
    badge: rarityBadgeLabel[rarity],
    ...extras,
  };
}

function buildBonusDrop(level: number): LevelRewardPreview["bonusDrop"] {
  const chance = seeded(level, 2);

  if (chance < 0.72) {
    return undefined;
  }

  const picked = rareDrops[Math.floor(seeded(level, 3) * rareDrops.length)] ?? rareDrops[0];

  return {
    kind: picked.kind,
    title: picked.title,
    rarity: picked.rarity,
    icon: picked.icon,
  };
}

export function buildLevelReward(level: number, sourceId = `level-${level}`): LevelRewardPreview {
  let base: Omit<LevelRewardPreview, "inventoryItem">;

  if (level % 20 === 0) {
    base = buildRewardFromTemplate(level, "mythic-drop", "mythic", "Mythic Drop", "☄️");
  } else if (level % 15 === 0) {
    base = buildRewardFromTemplate(level, "loot-chest", "legendary", "Legendary Chest", "🧿");
  } else if (level % 10 === 0) {
    const premium = premiumRewards[Math.floor((level / 10 - 1) % premiumRewards.length)] ?? premiumRewards[0];
    base = buildRewardFromTemplate(level, "epic-bundle", premium.rarity, premium.title, premium.icon);
  } else if (level % 5 === 0) {
    const milestone = milestoneRewards[Math.floor((level / 5 - 1) % milestoneRewards.length)] ?? milestoneRewards[0];
    base = buildRewardFromTemplate(level, "loot-chest", milestone.rarity, milestone.title, milestone.icon);
  } else {
    const small = smallRewards[(level - 2) % smallRewards.length] ?? smallRewards[0];
    base = buildRewardFromTemplate(level, small.kind, small.rarity, small.title, small.icon, {
      couponPercent: small.couponPercent,
      xpBoostPercent: small.xpBoostPercent,
      creditAmount: small.creditAmount,
    });
  }

  const reward: LevelRewardPreview = {
    ...base,
    bonusDrop: level % 5 === 0 ? buildBonusDrop(level) : undefined,
    inventoryItem: {
      id: "pending",
      name: base.title,
      category: "Reward",
      description: `${base.badge} reward unlocked at level ${level}.`,
      quantity: 1,
      rarity: rarityToInventoryRarity[base.rarity],
      iconPath: "/itens/general/ticket.png",
    },
  };

  reward.inventoryItem = createInventoryItem(reward, sourceId);

  return reward;
}

export function buildLevelRewards(startLevel: number, endLevel: number, sourceId = "level-up"): LevelRewardPreview[] {
  const rewards: LevelRewardPreview[] = [];

  for (let level = Math.max(2, startLevel); level <= endLevel; level += 1) {
    rewards.push(buildLevelReward(level, `${sourceId}-${level}`));
  }

  return rewards;
}

export function buildRewardTrack(level: number, highestRewardedLevel: number, size = 13): RewardTrackNode[] {
  const radius = Math.floor(size / 2);
  const start = Math.max(1, level - radius);
  const end = start + size - 1;
  const nodes: RewardTrackNode[] = [];

  for (let itemLevel = start; itemLevel <= end; itemLevel += 1) {
    const reward = buildLevelReward(itemLevel, `track-${itemLevel}`);
    const state: UnlockState = itemLevel <= highestRewardedLevel ? "claimed" : itemLevel === level ? "current" : "locked";

    nodes.push({
      level: itemLevel,
      reward,
      state,
      isMilestone: itemLevel % 5 === 0,
      isPremium: itemLevel % 10 === 0,
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
