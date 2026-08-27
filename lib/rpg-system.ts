import { getChestImagePath, type ChestId } from "./chests";
import type { InventoryItem } from "./profile-data";

export type PlayerTitle = "Rookie" | "Adventurer" | "Mercenary" | "Champion" | "Warlord" | "Mythic Hunter";

export type CraftOutputType = "chest" | "material" | "upgrade" | "item";

export type CraftRecipe = {
  id: string;
  title: string;
  description: string;
  outputType: CraftOutputType;
  coinCost?: number;
  outputItem: {
    id: string;
    name: string;
    category: string;
    rarity: InventoryItem["rarity"];
    quantity: number;
    iconPath?: string;
  };
  materials: Array<{
    itemId: string;
    quantity: number;
    name: string;
  }>;
  xpGain: number;
};

export const INVENTORY_BASE_SLOTS = 20;

const XP_BASE = 120;
const XP_STEP = 38;

const TITLE_BY_LEVEL: Array<{ min: number; title: PlayerTitle }> = [
  { min: 1, title: "Rookie" },
  { min: 5, title: "Adventurer" },
  { min: 10, title: "Mercenary" },
  { min: 15, title: "Champion" },
  { min: 20, title: "Warlord" },
  { min: 30, title: "Mythic Hunter" },
];

export const RUNE_DEFINITIONS: Array<{ id: string; name: string; rarity: InventoryItem["rarity"] }> = [
  { id: "rune-common", name: "Common Rune", rarity: "common" },
  { id: "rune-rare", name: "Rare Rune", rarity: "rare" },
  { id: "rune-epic", name: "Epic Rune", rarity: "epic" },
  { id: "rune-legendary", name: "Legendary Rune", rarity: "legendary" },
  { id: "rune-mythic", name: "Mythic Rune", rarity: "mythic" },
];

export function getXpForLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level));
  return XP_BASE + (normalized - 1) * XP_STEP;
}

export function getRpgLevelFromXp(xp: number): number {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 1;

  while (remaining >= getXpForLevel(level)) {
    remaining -= getXpForLevel(level);
    level += 1;
  }

  return level;
}

export function getXpIntoCurrentLevel(xp: number): { inLevel: number; levelCap: number } {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 1;

  while (remaining >= getXpForLevel(level)) {
    remaining -= getXpForLevel(level);
    level += 1;
  }

  return {
    inLevel: remaining,
    levelCap: getXpForLevel(level),
  };
}

export function getPlayerTitle(level: number): PlayerTitle {
  let result: PlayerTitle = "Rookie";

  for (const entry of TITLE_BY_LEVEL) {
    if (level >= entry.min) {
      result = entry.title;
    }
  }

  return result;
}

export function getInventorySlotLimitFromLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level));
  return INVENTORY_BASE_SLOTS + Math.floor(normalized / 5) * 5;
}

export function applyXpGain(currentXp: number, gain: number): {
  xp: number;
  level: number;
  title: PlayerTitle;
  slotLimit: number;
  leveledUp: boolean;
} {
  const nextXp = Math.max(0, Math.floor(currentXp) + Math.max(0, Math.floor(gain)));
  const previousLevel = getRpgLevelFromXp(currentXp);
  const level = getRpgLevelFromXp(nextXp);

  return {
    xp: nextXp,
    level,
    title: getPlayerTitle(level),
    slotLimit: getInventorySlotLimitFromLevel(level),
    leveledUp: level > previousLevel,
  };
}

export function clampPositiveInt(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

export function normalizeInventory(inventory: InventoryItem[]): InventoryItem[] {
  return inventory
    .map((item) => ({
      ...item,
      quantity: clampPositiveInt(item.quantity),
    }))
    .filter((item) => item.quantity > 0);
}

export function getUsedInventorySlots(inventory: InventoryItem[]): number {
  return normalizeInventory(inventory).length;
}

export function getItemQuantity(inventory: InventoryItem[], itemId: string): number {
  return inventory
    .filter((item) => item.id === itemId)
    .reduce((sum, item) => sum + clampPositiveInt(item.quantity), 0);
}

export function canMergeItemIntoInventory(inventory: InventoryItem[], item: InventoryItem, slotLimit: number): boolean {
  const normalized = normalizeInventory(inventory);
  const hasStack = normalized.some((entry) => entry.id === item.id);

  if (hasStack) {
    return true;
  }

  return getUsedInventorySlots(normalized) < slotLimit;
}

export function mergeItemIntoInventory(
  inventory: InventoryItem[],
  item: InventoryItem,
  slotLimit: number,
): { ok: boolean; inventory: InventoryItem[]; error?: string } {
  const normalized = normalizeInventory(inventory);
  const index = normalized.findIndex((entry) => entry.id === item.id);

  if (index >= 0) {
    return {
      ok: true,
      inventory: normalized.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }

        return {
          ...entry,
          quantity: clampPositiveInt(entry.quantity) + clampPositiveInt(item.quantity),
        };
      }),
    };
  }

  if (getUsedInventorySlots(normalized) >= slotLimit) {
    return {
      ok: false,
      inventory: normalized,
      error: "Inventory is full.",
    };
  }

  return {
    ok: true,
    inventory: [...normalized, { ...item, quantity: clampPositiveInt(item.quantity) }],
  };
}

export function removeItemQuantity(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number,
): { ok: boolean; inventory: InventoryItem[]; error?: string } {
  const desired = clampPositiveInt(quantity);
  const normalized = normalizeInventory(inventory);
  const index = normalized.findIndex((item) => item.id === itemId);

  if (desired <= 0) {
    return { ok: false, inventory: normalized, error: "Invalid quantity." };
  }

  if (index === -1) {
    return { ok: false, inventory: normalized, error: "Item not found." };
  }

  const current = normalized[index]!;
  if (current.quantity < desired) {
    return { ok: false, inventory: normalized, error: "Insufficient quantity." };
  }

  if (current.quantity === desired) {
    return {
      ok: true,
      inventory: normalized.filter((_, itemIndex) => itemIndex !== index),
    };
  }

  return {
    ok: true,
    inventory: normalized.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return {
        ...item,
        quantity: current.quantity - desired,
      };
    }),
  };
}

export function buildChestInventoryItem(chestId: ChestId): InventoryItem {
  const rarityByChest: Record<ChestId, InventoryItem["rarity"]> = {
    common: "common",
    uncommon: "uncommon",
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
    mythic: "mythic",
  };

  const titleByChest: Record<ChestId, string> = {
    common: "Common Chest",
    uncommon: "Uncommon Chest",
    rare: "Rare Chest",
    epic: "Epic Chest",
    legendary: "Legendary Chest",
    mythic: "Mythic Chest",
  };

  return {
    id: `chest-${chestId}`,
    name: titleByChest[chestId],
    category: "Chest",
    description: `${titleByChest[chestId]} forged for advanced loot cycles.`,
    quantity: 1,
    rarity: rarityByChest[chestId],
    iconPath: getChestImagePath(chestId),
  };
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "craft-gift-card-steam-10",
    title: "Steam Gift Card $10",
    description: "Craft a Steam Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-steam-10usd",
      name: "Steam Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/steam.jpg",
    },
    materials: [
      { itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" },
    ],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-steam-20",
    title: "Steam Gift Card $20",
    description: "Craft a Steam Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-steam-20usd",
      name: "Steam Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/steam.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-steam-50",
    title: "Steam Gift Card $50",
    description: "Craft a Steam Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-steam-50usd",
      name: "Steam Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/steam.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-gift-card-blizzard-10",
    title: "Blizzard Gift Card $10",
    description: "Craft a Blizzard Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-blizzard-10usd",
      name: "Blizzard Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/blizzard.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" }],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-blizzard-20",
    title: "Blizzard Gift Card $20",
    description: "Craft a Blizzard Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-blizzard-20usd",
      name: "Blizzard Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/blizzard.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-blizzard-50",
    title: "Blizzard Gift Card $50",
    description: "Craft a Blizzard Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-blizzard-50usd",
      name: "Blizzard Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/blizzard.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-gift-card-league-of-legends-10",
    title: "League of Legends Gift Card $10",
    description: "Craft a League of Legends Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-league-of-legends-10usd",
      name: "League of Legends Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/lol.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" }],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-league-of-legends-20",
    title: "League of Legends Gift Card $20",
    description: "Craft a League of Legends Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-league-of-legends-20usd",
      name: "League of Legends Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/lol.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-league-of-legends-50",
    title: "League of Legends Gift Card $50",
    description: "Craft a League of Legends Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-league-of-legends-50usd",
      name: "League of Legends Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/lol.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-gift-card-valorant-10",
    title: "Valorant Gift Card $10",
    description: "Craft a Valorant Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-valorant-10usd",
      name: "Valorant Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/valorant.webp",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" }],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-valorant-20",
    title: "Valorant Gift Card $20",
    description: "Craft a Valorant Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-valorant-20usd",
      name: "Valorant Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/valorant.webp",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-valorant-50",
    title: "Valorant Gift Card $50",
    description: "Craft a Valorant Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-valorant-50usd",
      name: "Valorant Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/valorant.webp",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-gift-card-google-play-10",
    title: "Google Play Gift Card $10",
    description: "Craft a Google Play Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-google-play-10usd",
      name: "Google Play Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/google.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" }],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-google-play-20",
    title: "Google Play Gift Card $20",
    description: "Craft a Google Play Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-google-play-20usd",
      name: "Google Play Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/google.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-google-play-50",
    title: "Google Play Gift Card $50",
    description: "Craft a Google Play Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-google-play-50usd",
      name: "Google Play Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/google.jpg",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-gift-card-xbox-10",
    title: "Xbox Gift Card $10",
    description: "Craft an Xbox Gift Card worth $10 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-xbox-10usd",
      name: "Xbox Gift Card $10",
      category: "Gift Card",
      rarity: "uncommon",
      quantity: 1,
      iconPath: "/giftcards/xbox.png",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 10, name: "Gift Card Fragment" }],
    xpGain: 24,
  },
  {
    id: "craft-gift-card-xbox-20",
    title: "Xbox Gift Card $20",
    description: "Craft an Xbox Gift Card worth $20 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-xbox-20usd",
      name: "Xbox Gift Card $20",
      category: "Gift Card",
      rarity: "rare",
      quantity: 1,
      iconPath: "/giftcards/xbox.png",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 20, name: "Gift Card Fragment" }],
    xpGain: 42,
  },
  {
    id: "craft-gift-card-xbox-50",
    title: "Xbox Gift Card $50",
    description: "Craft an Xbox Gift Card worth $50 using Gift Card Fragments.",
    outputType: "item",
    outputItem: {
      id: "gift-card-xbox-50usd",
      name: "Xbox Gift Card $50",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/giftcards/xbox.png",
    },
    materials: [{ itemId: "gift-card-fragment", quantity: 50, name: "Gift Card Fragment" }],
    xpGain: 90,
  },
  {
    id: "craft-uncommon-chest",
    title: "Uncommon Chest",
    description: "Craft one Uncommon Chest using Uncommon Treasure Map Fragments.",
    outputType: "chest",
    outputItem: {
      id: "chest-uncommon",
      name: "Uncommon Chest",
      category: "Chest",
      rarity: "uncommon",
      quantity: 1,
      iconPath: getChestImagePath("uncommon"),
    },
    materials: [{ itemId: "fragment-chest-uncommon", quantity: 10, name: "Uncommon Treasure Map Fragment" }],
    xpGain: 20,
  },
  {
    id: "craft-rare-chest",
    title: "Rare Chest",
    description: "Craft one Rare Chest using Rare Treasure Map Fragments.",
    outputType: "chest",
    outputItem: {
      id: "chest-rare",
      name: "Rare Chest",
      category: "Chest",
      rarity: "rare",
      quantity: 1,
      iconPath: getChestImagePath("rare"),
    },
    materials: [{ itemId: "fragment-chest-rare", quantity: 10, name: "Rare Treasure Map Fragment" }],
    xpGain: 26,
  },
  {
    id: "craft-epic-chest",
    title: "Epic Chest",
    description: "Craft one Epic Chest using Epic Treasure Map Fragments.",
    outputType: "chest",
    outputItem: {
      id: "chest-epic",
      name: "Epic Chest",
      category: "Chest",
      rarity: "epic",
      quantity: 1,
      iconPath: getChestImagePath("epic"),
    },
    materials: [{ itemId: "fragment-chest-epic", quantity: 10, name: "Epic Treasure Map Fragment" }],
    xpGain: 34,
  },
  {
    id: "craft-legendary-chest",
    title: "Legendary Chest",
    description: "Craft one Legendary Chest using Legendary Treasure Map Fragments.",
    outputType: "chest",
    outputItem: {
      id: "chest-legendary",
      name: "Legendary Chest",
      category: "Chest",
      rarity: "legendary",
      quantity: 1,
      iconPath: getChestImagePath("legendary"),
    },
    materials: [{ itemId: "fragment-chest-legendary", quantity: 10, name: "Legendary Treasure Map Fragment" }],
    xpGain: 44,
  },
  {
    id: "craft-mythic-chest",
    title: "Mythic Chest",
    description: "Craft one Mythic Chest using Mythic Treasure Map Fragments.",
    outputType: "chest",
    outputItem: {
      id: "chest-mythic",
      name: "Mythic Chest",
      category: "Chest",
      rarity: "mythic",
      quantity: 1,
      iconPath: getChestImagePath("mythic"),
    },
    materials: [{ itemId: "fragment-chest-mythic", quantity: 10, name: "Mythic Treasure Map Fragment" }],
    xpGain: 58,
  },
];

export function getCraftRecipe(recipeId: string): CraftRecipe | null {
  return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

