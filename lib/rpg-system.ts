import type { ChestId } from "./chests";
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

export type MarketplaceListingStatus = "active" | "sold" | "cancelled";

export type MarketplaceListing = {
  id: string;
  sellerUid: string;
  sellerName: string;
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fee: number;
  sellerReceives: number;
  rarity: InventoryItem["rarity"];
  status: MarketplaceListingStatus;
  createdAtMs: number;
  soldAtMs?: number;
  buyerUid?: string;
};

export const INVENTORY_BASE_SLOTS = 20;
export const MARKETPLACE_FEE_RATE = 0.05;
export const MARKETPLACE_MIN_PRICE = 25;

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
  { id: "rune-mythic", name: "Mythic Rune", rarity: "artifact" },
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
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
    mythic: "artifact",
  };

  const titleByChest: Record<ChestId, string> = {
    common: "Common Chest",
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
    iconPath: "/itens/general/ticket.png",
  };
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "craft-gift-card",
    title: "Gift Card",
    description: "Craft a random branded Gift Card from fragments.",
    outputType: "item",
    coinCost: 1,
    outputItem: {
      id: "gift-card",
      name: "Gift Card (Random Brand)",
      category: "Gift Card",
      rarity: "epic",
      quantity: 1,
      iconPath: "/itens/general/ticket.png",
    },
    materials: [
      { itemId: "gift-card-fragment", quantity: 5, name: "Gift Card Fragment" },
    ],
    xpGain: 88,
  },
];

export function getCraftRecipe(recipeId: string): CraftRecipe | null {
  return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function calculateMarketplaceFee(price: number): number {
  return Math.max(0, Math.round(Math.max(0, price) * MARKETPLACE_FEE_RATE));
}

export function calculateMarketplaceReceive(price: number): number {
  return Math.max(0, Math.round(Math.max(0, price) - calculateMarketplaceFee(price)));
}
