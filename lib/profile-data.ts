import { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { calculateLevelProgress, type UnlockHistoryItem, type RewardRarity } from "./level-rewards";
import { db, firebaseEnabled } from "./firebase";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  rarity:
    | "poor"
    | "common"
    | "uncommon"
    | "rare"
    | "epic"
    | "legendary"
    | "artifact"
    | "heirloom";
  iconPath?: string;
};

export type ProfileTransaction = {
  id: string;
  title: string;
  type: "purchase" | "sale";
  status: "Completed" | "Pending";
  value: string;
  createdAtLabel: string;
};

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  coverURL: string;
  lootCoins: number;
  tickets: number;
  keys: number;
  inventory: InventoryItem[];
  transactions: ProfileTransaction[];
  totalSpentCents: number;
  level: number;
  levelXpCents: number;
  nextLevelXpCents: number;
  highestRewardedLevel: number;
  recentUnlocks: UnlockHistoryItem[];
  lastXpGain: number;
  lastSpendUsd: number;
  lastProgressAt: string;
  lastLevelUpLevel: number;
  lastLevelUpAt: string;
  dailyStreak: number;
  seasonTrackTier: number;
  achievementPoints: number;
  rpgXp: number;
  rpgLevel: number;
  inventorySlotLimit: number;
  marketplaceSales: number;
  marketplaceBuys: number;
  marketplaceVolume: number;
  discordId?: string;
  discordUsername?: string;
};

const defaultInventory: InventoryItem[] = [
  {
    id: "chest-common",
    name: "Common Chest",
    category: "Chest",
    description: "Basic chest with starter loot.",
    quantity: 3,
    rarity: "common",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "chest-rare",
    name: "Rare Chest",
    category: "Chest",
    description: "Improved chest with better odds.",
    quantity: 2,
    rarity: "rare",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "chest-epic",
    name: "Epic Chest",
    category: "Chest",
    description: "High-value chest with premium drops.",
    quantity: 1,
    rarity: "epic",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-wood",
    name: "Wood",
    category: "Material",
    description: "Core crafting material for chest forging.",
    quantity: 40,
    rarity: "common",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-metal",
    name: "Metal",
    category: "Material",
    description: "Refined metal used in reinforced chests.",
    quantity: 25,
    rarity: "common",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-elder-wood",
    name: "Elder Wood",
    category: "Material",
    description: "Rare wood from ancient biomes.",
    quantity: 10,
    rarity: "rare",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-astral-metal",
    name: "Astral Metal",
    category: "Material",
    description: "High-density ore with unstable energy.",
    quantity: 7,
    rarity: "epic",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-void-shard",
    name: "Void Shard",
    category: "Material",
    description: "Fragment from mythic dimensional rifts.",
    quantity: 3,
    rarity: "legendary",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "material-celestial-core",
    name: "Celestial Core",
    category: "Material",
    description: "Ultra-rare catalyst for mythic crafting.",
    quantity: 1,
    rarity: "artifact",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "rune-common",
    name: "Common Rune",
    category: "Rune",
    description: "Basic rune that stabilizes common crafts.",
    quantity: 4,
    rarity: "common",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "rune-rare",
    name: "Rare Rune",
    category: "Rune",
    description: "Rune used to bind rare chest recipes.",
    quantity: 2,
    rarity: "rare",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "rune-epic",
    name: "Epic Rune",
    category: "Rune",
    description: "High-energy rune for epic crafting.",
    quantity: 1,
    rarity: "epic",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "rune-legendary",
    name: "Legendary Rune",
    category: "Rune",
    description: "Rare catalyst rune for legendary recipes.",
    quantity: 1,
    rarity: "legendary",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "rune-mythic",
    name: "Mythic Rune",
    category: "Rune",
    description: "Mythic rune that defines apex chest quality.",
    quantity: 1,
    rarity: "artifact",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "inv-ticket-common",
    name: "Traveler Ticket",
    category: "Ticket",
    description: "Basic ticket used for common reward entries.",
    quantity: 1,
    rarity: "common",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "inv-ticket-uncommon",
    name: "Explorer Ticket",
    category: "Ticket",
    description: "Uncommon ticket used for improved drop tables.",
    quantity: 1,
    rarity: "uncommon",
    iconPath: "/itens/general/ticket.png",
  },
  {
    id: "inv-ticket-epic",
    name: "Champion Ticket",
    category: "Ticket",
    description: "Epic ticket used for high-value reward entries.",
    quantity: 1,
    rarity: "epic",
    iconPath: "/itens/general/ticket.png",
  },
];

const defaultTransactions: ProfileTransaction[] = [
  {
    id: "tx-1",
    title: "Purchase of 5,000 gold",
    type: "purchase",
    status: "Completed",
    value: "R$ 179,00",
    createdAtLabel: "Today",
  },
  {
    id: "tx-2",
    title: "Retail account sale",
    type: "sale",
    status: "Pending",
    value: "R$ 420,00",
    createdAtLabel: "Yesterday",
  },
  {
    id: "tx-3",
    title: "M+ boost purchase",
    type: "purchase",
    status: "Completed",
    value: "R$ 89,00",
    createdAtLabel: "2 days ago",
  },
];

const ENABLE_STARTER_INVENTORY = false;

export const defaultCoverURL = "/wow/wow-classic-era/classic-era-wallpaper.avif";
export const defaultPhotoURL = "/lootmasterlogo.png";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const parsed = value as Partial<InventoryItem>;

  return (
    typeof parsed.id === "string" &&
    typeof parsed.name === "string" &&
    typeof parsed.category === "string" &&
    typeof parsed.description === "string" &&
    typeof parsed.quantity === "number" &&
    (parsed.rarity === "poor" ||
      parsed.rarity === "common" ||
      parsed.rarity === "uncommon" ||
      parsed.rarity === "rare" ||
      parsed.rarity === "epic" ||
      parsed.rarity === "legendary" ||
      parsed.rarity === "artifact" ||
      parsed.rarity === "heirloom")
  );
}

function isTransaction(value: unknown): value is ProfileTransaction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const parsed = value as Partial<ProfileTransaction>;

  return (
    typeof parsed.id === "string" &&
    typeof parsed.title === "string" &&
    (parsed.type === "purchase" || parsed.type === "sale") &&
    (parsed.status === "Completed" || parsed.status === "Pending") &&
    typeof parsed.value === "string" &&
    typeof parsed.createdAtLabel === "string"
  );
}

function isRewardRarity(value: unknown): value is RewardRarity {
  return value === "common" || value === "rare" || value === "epic" || value === "legendary" || value === "mythic";
}

function isUnlockHistoryItem(value: unknown): value is UnlockHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const parsed = value as Partial<UnlockHistoryItem>;

  return (
    typeof parsed.id === "string" &&
    typeof parsed.level === "number" &&
    typeof parsed.title === "string" &&
    isRewardRarity(parsed.rarity) &&
    typeof parsed.icon === "string" &&
    typeof parsed.kind === "string" &&
    typeof parsed.unlockedAt === "string"
  );
}

function createDefaultProfile(user: Pick<User, "uid" | "displayName" | "email" | "photoURL">): UserProfile {
  const progress = calculateLevelProgress(0);

  return {
    uid: user.uid,
    username: user.displayName?.trim() || "Adventurer",
    email: user.email?.trim().toLowerCase() || "",
    photoURL: user.photoURL || defaultPhotoURL,
    coverURL: defaultCoverURL,
    lootCoins: 1250,
    tickets: 12,
    keys: 4,
    inventory: ENABLE_STARTER_INVENTORY ? defaultInventory : [],
    transactions: defaultTransactions,
    totalSpentCents: progress.totalSpentCents,
    level: progress.level,
    levelXpCents: progress.xpCents,
    nextLevelXpCents: progress.nextLevelXpCents,
    highestRewardedLevel: progress.level,
    recentUnlocks: [],
    lastXpGain: 0,
    lastSpendUsd: 0,
    lastProgressAt: "",
    lastLevelUpLevel: 0,
    lastLevelUpAt: "",
    dailyStreak: 1,
    seasonTrackTier: 1,
    achievementPoints: 0,
    rpgXp: 0,
    rpgLevel: 1,
    inventorySlotLimit: 20,
    marketplaceSales: 0,
    marketplaceBuys: 0,
    marketplaceVolume: 0,
  };
}

export function mapUserProfile(uid: string, source: Record<string, unknown>): UserProfile {
  const fallback = createDefaultProfile({ uid, displayName: null, email: null, photoURL: null });

  const inventoryRaw = Array.isArray(source.inventory) ? source.inventory : [];
  const transactionsRaw = Array.isArray(source.transactions) ? source.transactions : [];
  const recentUnlocksRaw = Array.isArray(source.recentUnlocks) ? source.recentUnlocks : [];

  const inventory = inventoryRaw.filter(isInventoryItem);
  const transactions = transactionsRaw.filter(isTransaction);
  const recentUnlocks = recentUnlocksRaw.filter(isUnlockHistoryItem);
  const spentCents = getNumber(source.totalSpentCents, fallback.totalSpentCents);
  const progress = calculateLevelProgress(spentCents);

  return {
    uid,
    username: getString(source.username, fallback.username),
    email: getString(source.email, fallback.email),
    photoURL: getString(source.photoURL, fallback.photoURL),
    coverURL: getString(source.coverURL, fallback.coverURL),
    lootCoins: getNumber(source.lootCoins, fallback.lootCoins),
    tickets: getNumber(source.tickets, fallback.tickets),
    keys: getNumber(source.keys, fallback.keys),
    inventory: inventory.length > 0 ? inventory : fallback.inventory,
    transactions: transactions.length > 0 ? transactions : fallback.transactions,
    totalSpentCents: spentCents,
    level: getNumber(source.level, progress.level),
    levelXpCents: getNumber(source.levelXpCents, progress.xpCents),
    nextLevelXpCents: getNumber(source.nextLevelXpCents, progress.nextLevelXpCents),
    highestRewardedLevel: getNumber(source.highestRewardedLevel, progress.level),
    recentUnlocks,
    lastXpGain: getNumber(source.lastXpGain, fallback.lastXpGain),
    lastSpendUsd: getNumber(source.lastSpendUsd, fallback.lastSpendUsd),
    lastProgressAt: getString(source.lastProgressAt, fallback.lastProgressAt),
    lastLevelUpLevel: getNumber(source.lastLevelUpLevel, fallback.lastLevelUpLevel),
    lastLevelUpAt: getString(source.lastLevelUpAt, fallback.lastLevelUpAt),
    dailyStreak: getNumber(source.dailyStreak, fallback.dailyStreak),
    seasonTrackTier: getNumber(source.seasonTrackTier, fallback.seasonTrackTier),
    achievementPoints: getNumber(source.achievementPoints, fallback.achievementPoints),
    rpgXp: getNumber(source.rpgXp, fallback.rpgXp),
    rpgLevel: getNumber(source.rpgLevel, fallback.rpgLevel),
    inventorySlotLimit: getNumber(source.inventorySlotLimit, fallback.inventorySlotLimit),
    marketplaceSales: getNumber(source.marketplaceSales, fallback.marketplaceSales),
    marketplaceBuys: getNumber(source.marketplaceBuys, fallback.marketplaceBuys),
    marketplaceVolume: getNumber(source.marketplaceVolume, fallback.marketplaceVolume),
    ...(typeof source.discordId === "string" && { discordId: source.discordId }),
    ...(typeof source.discordUsername === "string" && { discordUsername: source.discordUsername }),
  };
}

type EnsureProfileInput = {
  username?: string;
  email?: string;
  assignedAgentId?: string | null;
};

export async function ensureUserProfileDoc(user: User, input?: EnsureProfileInput): Promise<UserProfile | null> {
  if (!firebaseEnabled || !db) {
    return null;
  }

  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const existingRaw = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;

  const baseProfile = existingRaw
    ? mapUserProfile(user.uid, existingRaw)
    : createDefaultProfile(user);

  const mergedProfile: UserProfile = {
    ...baseProfile,
    username: input?.username?.trim() || baseProfile.username,
    email: input?.email?.trim().toLowerCase() || baseProfile.email,
    photoURL: user.photoURL || baseProfile.photoURL,
  };

  await setDoc(
    ref,
    {
      ...mergedProfile,
      uid: user.uid,
      authProvider: "google",
      assignedAgentId: input?.assignedAgentId ?? existingRaw?.assignedAgentId ?? null,
      updatedAt: serverTimestamp(),
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );

  return mergedProfile;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!firebaseEnabled || !db) {
    return null;
  }

  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapUserProfile(uid, snapshot.data() as Record<string, unknown>);
}
