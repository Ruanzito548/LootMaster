import type { InventoryItem } from "./profile-data";

export const XP_PER_USD = 1;
export const LOOT_COINS_PER_USD = 20;
export const LEVEL_CAP = 500;

export type RewardKind =
  | "lc-pack"
  | "chest"
  | "key"
  | "gift-fragment"
  | "gift-fragment-bundle"
  | "gift-card-bundle"
  | "marketplace-credits"
  | "coupon"
  | "booster"
  | "cosmetic"
  | "title"
  | "avatar"
  | "animated-border"
  | "mystery-box"
  | "premium-bundle"
  | "event-ticket";

export type RewardRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

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
  lcAmount?: number;
  fragmentAmount?: number;
  marketplaceCreditAmount?: number;
  xpBoostPercent?: number;
  couponPercent?: number;
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

type RewardTemplate = {
  kind: RewardKind;
  rarity: RewardRarity;
  title: string;
  icon: string;
  lcAmount?: number;
  fragmentAmount?: number;
  marketplaceCreditAmount?: number;
  xpBoostPercent?: number;
  couponPercent?: number;
};

const XP_ANCHORS: Array<{ level: number; xp: number }> = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 450 },
  { level: 5, xp: 700 },
  { level: 10, xp: 3000 },
  { level: 20, xp: 12000 },
  { level: 50, xp: 100000 },
];

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

const COMMON_REWARDS: RewardTemplate[] = [
  { kind: "chest", rarity: "common", title: "Bronze Chest", icon: "🧰" },
  { kind: "lc-pack", rarity: "common", title: "Small LC Pack", icon: "🪙", lcAmount: 350 },
  { kind: "booster", rarity: "common", title: "XP Booster", icon: "⚡", xpBoostPercent: 10 },
  { kind: "gift-fragment", rarity: "common", title: "Gift Fragment", icon: "🧩", fragmentAmount: 1 },
  { kind: "event-ticket", rarity: "common", title: "Event Ticket", icon: "🎫" },
  { kind: "coupon", rarity: "common", title: "Starter Coupon", icon: "🎟️", couponPercent: 3 },
  { kind: "key", rarity: "common", title: "Vault Key", icon: "🗝️" },
  { kind: "lc-pack", rarity: "common", title: "LC Boost", icon: "💰", lcAmount: 420 },
  { kind: "gift-fragment", rarity: "common", title: "Fragment Duo", icon: "🧩", fragmentAmount: 2 },
  { kind: "marketplace-credits", rarity: "common", title: "Market Credits", icon: "💠", marketplaceCreditAmount: 40 },
];

const RARE_REWARDS: RewardTemplate[] = [
  { kind: "chest", rarity: "rare", title: "Silver Chest", icon: "🪙" },
  { kind: "key", rarity: "rare", title: "Vault Key", icon: "🔐" },
  { kind: "marketplace-credits", rarity: "rare", title: "Marketplace Credits", icon: "💠", marketplaceCreditAmount: 120 },
  { kind: "gift-fragment-bundle", rarity: "rare", title: "Fragment Bundle", icon: "🧩", fragmentAmount: 3 },
  { kind: "booster", rarity: "rare", title: "Advanced XP Booster", icon: "⚡", xpBoostPercent: 20 },
  { kind: "coupon", rarity: "rare", title: "Rare Coupon", icon: "🎟️", couponPercent: 5 },
  { kind: "lc-pack", rarity: "rare", title: "Medium LC Pack", icon: "🪙", lcAmount: 900 },
  { kind: "mystery-box", rarity: "rare", title: "Mystery Box", icon: "🎁" },
  { kind: "cosmetic", rarity: "rare", title: "Rare Cosmetic", icon: "✨" },
  { kind: "gift-fragment-bundle", rarity: "rare", title: "Gift Fragment Pack", icon: "🧩", fragmentAmount: 4 },
];

const EPIC_REWARDS: RewardTemplate[] = [
  { kind: "chest", rarity: "epic", title: "Gold Chest", icon: "📦" },
  { kind: "key", rarity: "epic", title: "Epic Key", icon: "🗝️" },
  { kind: "mystery-box", rarity: "epic", title: "Mystery Box", icon: "🎲" },
  { kind: "coupon", rarity: "epic", title: "Epic Coupon", icon: "🎟️", couponPercent: 10 },
  { kind: "lc-pack", rarity: "epic", title: "Big LC Pack", icon: "💰", lcAmount: 2200 },
  { kind: "gift-fragment-bundle", rarity: "epic", title: "Epic Fragment Bundle", icon: "🧩", fragmentAmount: 6 },
  { kind: "marketplace-credits", rarity: "epic", title: "Epic Market Credits", icon: "💠", marketplaceCreditAmount: 340 },
  { kind: "booster", rarity: "epic", title: "Hero XP Booster", icon: "⚡", xpBoostPercent: 30 },
  { kind: "cosmetic", rarity: "epic", title: "Epic Cosmetic", icon: "🌌" },
  { kind: "title", rarity: "epic", title: "Profile Title", icon: "🏷️" },
];

const LEGENDARY_REWARDS: RewardTemplate[] = [
  { kind: "chest", rarity: "legendary", title: "Diamond Chest", icon: "💎" },
  { kind: "premium-bundle", rarity: "legendary", title: "Premium Bundle", icon: "🎁" },
  { kind: "key", rarity: "legendary", title: "Legendary Key", icon: "🔑" },
  { kind: "cosmetic", rarity: "legendary", title: "Exclusive Cosmetic", icon: "✨" },
  { kind: "gift-card-bundle", rarity: "legendary", title: "Gift Card Fragment Bundle", icon: "🧩", fragmentAmount: 10 },
  { kind: "marketplace-credits", rarity: "legendary", title: "Legendary Credits", icon: "💠", marketplaceCreditAmount: 650 },
  { kind: "coupon", rarity: "legendary", title: "Legend Coupon", icon: "🎟️", couponPercent: 15 },
  { kind: "lc-pack", rarity: "legendary", title: "Legend LC Pack", icon: "🪙", lcAmount: 5000 },
  { kind: "animated-border", rarity: "legendary", title: "Animated Border", icon: "🟠" },
  { kind: "title", rarity: "legendary", title: "Prestige Title", icon: "👑" },
];

const MYTHIC_REWARDS: RewardTemplate[] = [
  { kind: "avatar", rarity: "mythic", title: "Limited Avatar", icon: "🧬" },
  { kind: "animated-border", rarity: "mythic", title: "Animated Border", icon: "🌠" },
  { kind: "title", rarity: "mythic", title: "Mythic Title", icon: "👑" },
  { kind: "lc-pack", rarity: "mythic", title: "Huge LC Pack", icon: "💰", lcAmount: 12000 },
  { kind: "gift-card-bundle", rarity: "mythic", title: "Rare Gift Card Bundle", icon: "🎁", fragmentAmount: 15 },
  { kind: "premium-bundle", rarity: "mythic", title: "Mythic Bundle", icon: "☄️" },
  { kind: "marketplace-credits", rarity: "mythic", title: "Mythic Marketplace Credits", icon: "💠", marketplaceCreditAmount: 1200 },
  { kind: "coupon", rarity: "mythic", title: "Mythic Coupon", icon: "🎟️", couponPercent: 20 },
  { kind: "cosmetic", rarity: "mythic", title: "Exclusive Mythic Cosmetic", icon: "🌌" },
  { kind: "event-ticket", rarity: "mythic", title: "Exclusive Event Ticket", icon: "🎫" },
];

function normalizeCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pseudoRandom(level: number, salt = 0): number {
  const base = Math.sin(level * 12.9898 + salt * 78.233) * 43758.5453123;
  return base - Math.floor(base);
}

function pickTemplate(pool: RewardTemplate[], level: number, salt = 0): RewardTemplate {
  const index = Math.floor(pseudoRandom(level, salt) * pool.length);
  return pool[index] ?? pool[0]!;
}

function getAnchorBounds(level: number): { left: { level: number; xp: number }; right: { level: number; xp: number } } {
  const normalized = Math.max(1, Math.floor(level));

  for (let index = 0; index < XP_ANCHORS.length - 1; index += 1) {
    const left = XP_ANCHORS[index]!;
    const right = XP_ANCHORS[index + 1]!;

    if (normalized >= left.level && normalized <= right.level) {
      return { left, right };
    }
  }

  const secondLast = XP_ANCHORS[XP_ANCHORS.length - 2]!;
  const last = XP_ANCHORS[XP_ANCHORS.length - 1]!;
  return { left: secondLast, right: last };
}

export function getXpThresholdForLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level));

  if (normalized === 1) {
    return 0;
  }

  const exactAnchor = XP_ANCHORS.find((anchor) => anchor.level === normalized);
  if (exactAnchor) {
    return exactAnchor.xp;
  }

  if (normalized > XP_ANCHORS[XP_ANCHORS.length - 1]!.level) {
    const last = XP_ANCHORS[XP_ANCHORS.length - 1]!;
    const prev = XP_ANCHORS[XP_ANCHORS.length - 2]!;
    const growth = Math.pow(last.xp / prev.xp, 1 / (last.level - prev.level));
    const deltaLevels = normalized - last.level;
    return Math.round(last.xp * Math.pow(growth, deltaLevels));
  }

  const { left, right } = getAnchorBounds(normalized);
  const ratio = (normalized - left.level) / (right.level - left.level);

  if (left.xp <= 0) {
    return Math.round(right.xp * ratio);
  }

  const interpolated = left.xp * Math.pow(right.xp / left.xp, ratio);
  return Math.round(interpolated);
}

export function getLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));

  let low = 1;
  let high = LEVEL_CAP;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentThreshold = getXpThresholdForLevel(mid);
    const nextThreshold = mid >= LEVEL_CAP ? Number.MAX_SAFE_INTEGER : getXpThresholdForLevel(mid + 1);

    if (xp >= currentThreshold && xp < nextThreshold) {
      return mid;
    }

    if (xp < currentThreshold) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return LEVEL_CAP;
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

  const level = getLevelFromXp(totalXp);
  const currentLevelThreshold = getXpThresholdForLevel(level);
  const nextLevelThreshold = getXpThresholdForLevel(Math.min(LEVEL_CAP, level + 1));
  const currentLevelRequirement = Math.max(1, nextLevelThreshold - currentLevelThreshold);
  const xpInsideLevel = round2(Math.max(0, totalXp - currentLevelThreshold));
  const xpToNextLevel = level >= LEVEL_CAP ? 0 : round2(Math.max(0, nextLevelThreshold - totalXp));

  return {
    level,
    totalSpentCents: normalizedTotalSpentCents,
    totalSpentUsd,
    totalXp,
    xpCents: xpInsideLevel,
    nextLevelXpCents: currentLevelRequirement,
    progressPercent:
      level >= LEVEL_CAP
        ? 100
        : Math.min(100, Math.max(0, round2((xpInsideLevel / currentLevelRequirement) * 100))),
    xpToNextLevel,
    spendToNextLevelUsd: round2(xpToNextLevel / XP_PER_USD),
    nextLevel: Math.min(LEVEL_CAP, level + 1),
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

function buildRewardFromTemplate(level: number, template: RewardTemplate): Omit<LevelRewardPreview, "inventoryItem"> {
  return {
    level,
    kind: template.kind,
    rarity: template.rarity,
    title: template.title,
    shortLabel: template.title,
    description: `${template.title} unlocked at level ${level}.`,
    icon: template.icon,
    badge: rarityBadgeLabel[template.rarity],
    lcAmount: template.lcAmount,
    fragmentAmount: template.fragmentAmount,
    marketplaceCreditAmount: template.marketplaceCreditAmount,
    xpBoostPercent: template.xpBoostPercent,
    couponPercent: template.couponPercent,
  };
}

function chooseNonMilestoneReward(level: number): RewardTemplate {
  const roll = pseudoRandom(level, 99);

  if (roll < 0.55) {
    return pickTemplate(COMMON_REWARDS, level, 3);
  }

  if (roll < 0.85) {
    return pickTemplate(RARE_REWARDS, level, 7);
  }

  return pickTemplate(EPIC_REWARDS, level, 11);
}

export function buildLevelReward(level: number, sourceId = `level-${level}`): LevelRewardPreview {
  const normalizedLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));

  let template: RewardTemplate;

  if (normalizedLevel % 25 === 0) {
    template = pickTemplate(MYTHIC_REWARDS, normalizedLevel, 15);
  } else if (normalizedLevel % 10 === 0) {
    template = pickTemplate(LEGENDARY_REWARDS, normalizedLevel, 19);
  } else if (normalizedLevel % 5 === 0) {
    template = pickTemplate(EPIC_REWARDS, normalizedLevel, 23);
  } else {
    template = chooseNonMilestoneReward(normalizedLevel);
  }

  const reward: LevelRewardPreview = {
    ...buildRewardFromTemplate(normalizedLevel, template),
    inventoryItem: {
      id: "pending",
      name: template.title,
      category: "Reward",
      description: `${rarityBadgeLabel[template.rarity]} reward unlocked at level ${normalizedLevel}.`,
      quantity: 1,
      rarity: rarityToInventoryRarity[template.rarity],
      iconPath: "/itens/general/ticket.png",
    },
  };

  reward.inventoryItem = createInventoryItem(reward, sourceId);
  return reward;
}

export function buildLevelRewards(startLevel: number, endLevel: number, sourceId = "level-up"): LevelRewardPreview[] {
  const rewards: LevelRewardPreview[] = [];

  const safeStart = Math.max(1, Math.floor(startLevel));
  const safeEnd = Math.max(safeStart, Math.floor(endLevel));

  for (let level = safeStart; level <= safeEnd; level += 1) {
    rewards.push(buildLevelReward(level, `${sourceId}-${level}`));
  }

  return rewards;
}

export function buildRewardTrack(level: number, highestRewardedLevel: number, size = 15): RewardTrackNode[] {
  const center = Math.max(1, Math.floor(level));
  const radius = Math.floor(size / 2);
  const start = Math.max(1, center - radius);
  const end = Math.min(LEVEL_CAP, start + size - 1);
  const nodes: RewardTrackNode[] = [];

  for (let itemLevel = start; itemLevel <= end; itemLevel += 1) {
    const reward = buildLevelReward(itemLevel, `track-${itemLevel}`);

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
