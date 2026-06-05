import type { InventoryItem } from "./profile-data";

export type ChestRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type ChestId = ChestRarity;

export type ChestRewardType = "coins" | "item" | "chest" | "cosmetic";

export type ChestRewardOddsEntry = {
  type: ChestRewardType;
  weight: number;
};

export type ChestDefinition = {
  id: ChestId;
  rarity: ChestRarity;
  title: string;
  shortLabel: string;
  description: string;
  inventoryItemId: string;
  inventoryItemName: string;
  borderClass: string;
  glowClass: string;
  badgeClass: string;
  rewardOdds: ChestRewardOddsEntry[];
  coinRange: {
    min: number;
    max: number;
  };
  itemRarityWeights: Array<{
    rarity: InventoryItem["rarity"];
    weight: number;
  }>;
};

export const CHEST_DEFINITIONS: Record<ChestId, ChestDefinition> = {
  common: {
    id: "common",
    rarity: "common",
    title: "Common Chest",
    shortLabel: "Common",
    description: "Frequent drops and starter rewards.",
    inventoryItemId: "chest-common",
    inventoryItemName: "Common Chest",
    borderClass: "border-[#d4d8df]/40",
    glowClass: "shadow-[0_0_26px_rgba(212,216,223,0.16)]",
    badgeClass: "bg-[#d4d8df]/16 text-[#d4d8df] border-[#d4d8df]/40",
    rewardOdds: [
      { type: "coins", weight: 62 },
      { type: "item", weight: 28 },
      { type: "chest", weight: 8 },
      { type: "cosmetic", weight: 2 },
    ],
    coinRange: { min: 45, max: 140 },
    itemRarityWeights: [
      { rarity: "common", weight: 73 },
      { rarity: "uncommon", weight: 22 },
      { rarity: "rare", weight: 5 },
    ],
  },
  rare: {
    id: "rare",
    rarity: "rare",
    title: "Rare Chest",
    shortLabel: "Rare",
    description: "Improved rates with stronger rewards.",
    inventoryItemId: "chest-rare",
    inventoryItemName: "Rare Chest",
    borderClass: "border-[#57a6ff]/46",
    glowClass: "shadow-[0_0_30px_rgba(87,166,255,0.2)]",
    badgeClass: "bg-[#57a6ff]/16 text-[#8cc8ff] border-[#57a6ff]/42",
    rewardOdds: [
      { type: "coins", weight: 52 },
      { type: "item", weight: 31 },
      { type: "chest", weight: 13 },
      { type: "cosmetic", weight: 4 },
    ],
    coinRange: { min: 90, max: 260 },
    itemRarityWeights: [
      { rarity: "uncommon", weight: 58 },
      { rarity: "rare", weight: 30 },
      { rarity: "epic", weight: 12 },
    ],
  },
  epic: {
    id: "epic",
    rarity: "epic",
    title: "Epic Chest",
    shortLabel: "Epic",
    description: "High-value loot and rare drops.",
    inventoryItemId: "chest-epic",
    inventoryItemName: "Epic Chest",
    borderClass: "border-[#b86bff]/48",
    glowClass: "shadow-[0_0_34px_rgba(184,107,255,0.24)]",
    badgeClass: "bg-[#b86bff]/16 text-[#d8b1ff] border-[#b86bff]/44",
    rewardOdds: [
      { type: "coins", weight: 41 },
      { type: "item", weight: 34 },
      { type: "chest", weight: 18 },
      { type: "cosmetic", weight: 7 },
    ],
    coinRange: { min: 170, max: 520 },
    itemRarityWeights: [
      { rarity: "rare", weight: 49 },
      { rarity: "epic", weight: 35 },
      { rarity: "legendary", weight: 16 },
    ],
  },
  legendary: {
    id: "legendary",
    rarity: "legendary",
    title: "Legendary Chest",
    shortLabel: "Legendary",
    description: "Top-tier rewards with major loot spikes.",
    inventoryItemId: "chest-legendary",
    inventoryItemName: "Legendary Chest",
    borderClass: "border-[#ffb24a]/52",
    glowClass: "shadow-[0_0_40px_rgba(255,178,74,0.28)]",
    badgeClass: "bg-[#ffb24a]/16 text-[#ffd69a] border-[#ffb24a]/46",
    rewardOdds: [
      { type: "coins", weight: 32 },
      { type: "item", weight: 35 },
      { type: "chest", weight: 22 },
      { type: "cosmetic", weight: 11 },
    ],
    coinRange: { min: 330, max: 900 },
    itemRarityWeights: [
      { rarity: "epic", weight: 47 },
      { rarity: "legendary", weight: 39 },
      { rarity: "artifact", weight: 14 },
    ],
  },
  mythic: {
    id: "mythic",
    rarity: "mythic",
    title: "Mythic Chest",
    shortLabel: "Mythic",
    description: "Ultra-premium chest with elite loot table.",
    inventoryItemId: "chest-mythic",
    inventoryItemName: "Mythic Chest",
    borderClass: "border-[#ff4d5f]/54",
    glowClass: "shadow-[0_0_44px_rgba(255,77,95,0.32)]",
    badgeClass: "bg-[#ff4d5f]/16 text-[#ffb8c0] border-[#ff4d5f]/48",
    rewardOdds: [
      { type: "coins", weight: 24 },
      { type: "item", weight: 37 },
      { type: "chest", weight: 23 },
      { type: "cosmetic", weight: 16 },
    ],
    coinRange: { min: 620, max: 1600 },
    itemRarityWeights: [
      { rarity: "legendary", weight: 43 },
      { rarity: "artifact", weight: 31 },
      { rarity: "heirloom", weight: 26 },
    ],
  },
};

export const CHEST_IDS: ChestId[] = ["common", "rare", "epic", "legendary", "mythic"];

export function getChestDefinition(chestId: string): ChestDefinition | null {
  if (chestId in CHEST_DEFINITIONS) {
    return CHEST_DEFINITIONS[chestId as ChestId];
  }

  return null;
}

export function getChestCountFromInventory(inventory: InventoryItem[], chestId: ChestId): number {
  const chest = CHEST_DEFINITIONS[chestId];

  return inventory.reduce((total, item) => {
    if (item.id !== chest.inventoryItemId) {
      return total;
    }

    const quantity = Number.isFinite(item.quantity) ? Math.max(0, Math.floor(item.quantity)) : 0;
    return total + quantity;
  }, 0);
}
