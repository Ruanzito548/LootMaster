import { randomInt } from "node:crypto";

import type { ChestId } from "@/lib/chests";
import type { InventoryItem } from "@/lib/profile-data";

export const CHEST_EXPECTED_VALUE_USD: Record<ChestId, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 20,
  mythic: 50,
};

type CouponTier = "off-5" | "off-10" | "off-15" | "off-20" | "premium";

type LootSpec =
  | { kind: "coins"; quantity: number }
  | { kind: "gift-fragment"; quantity: number }
  | { kind: "chest-fragment"; quantity: number; chest: ChestId }
  | { kind: "coupon"; quantity: 1; coupon: CouponTier };

type LootBundle = {
  weight: number;
  drops: LootSpec[];
};

export type ChestLootDrop =
  | {
      kind: "coins";
      amount: number;
      title: string;
      valueUsd: number;
    }
  | {
      kind: "item";
      title: string;
      valueUsd: number;
      item: InventoryItem;
    };

const ITEM_COUNT_RULES: Record<ChestId, { min: number; max: number }> = {
  common: { min: 1, max: 1 },
  uncommon: { min: 1, max: 2 },
  rare: { min: 2, max: 3 },
  epic: { min: 3, max: 5 },
  legendary: { min: 4, max: 6 },
  mythic: { min: 5, max: 8 },
};

const COUPON_VALUE_USD: Record<CouponTier, number> = {
  "off-5": 1,
  "off-10": 1,
  "off-15": 2,
  "off-20": 3,
  premium: 5,
};

const VALUE_TOLERANCE_USD: Record<ChestId, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 1,
  legendary: 2,
  mythic: 4,
};

const CHEST_FRAGMENT_META: Record<ChestId, { id: string; name: string; rarity: InventoryItem["rarity"] }> = {
  common: { id: "fragment-chest-common", name: "Common Chest Fragment", rarity: "common" },
  uncommon: { id: "fragment-chest-uncommon", name: "Uncommon Chest Fragment", rarity: "common" },
  rare: { id: "fragment-chest-rare", name: "Rare Chest Fragment", rarity: "rare" },
  epic: { id: "fragment-chest-epic", name: "Epic Chest Fragment", rarity: "epic" },
  legendary: { id: "fragment-chest-legendary", name: "Legendary Chest Fragment", rarity: "legendary" },
  mythic: { id: "fragment-chest-mythic", name: "Mythic Chest Fragment", rarity: "artifact" },
};

const COUPON_META: Record<CouponTier, { id: string; name: string; rarity: InventoryItem["rarity"] }> = {
  "off-5": { id: "coupon-off-5", name: "5% OFF Coupon", rarity: "uncommon" },
  "off-10": { id: "coupon-off-10", name: "10% OFF Coupon", rarity: "rare" },
  "off-15": { id: "coupon-off-15", name: "15% OFF Coupon", rarity: "epic" },
  "off-20": { id: "coupon-off-20", name: "20% OFF Coupon", rarity: "legendary" },
  premium: { id: "coupon-premium", name: "Premium Discount Coupon", rarity: "artifact" },
};

const LOOT_BUNDLES: Record<ChestId, LootBundle[]> = {
  common: [
    { weight: 40, drops: [{ kind: "coins", quantity: 1 }] },
    { weight: 30, drops: [{ kind: "gift-fragment", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "chest-fragment", chest: "uncommon", quantity: 1 }] },
    { weight: 10, drops: [{ kind: "coupon", coupon: "off-5", quantity: 1 }] },
  ],
  uncommon: [
    { weight: 20, drops: [{ kind: "coins", quantity: 2 }] },
    { weight: 18, drops: [{ kind: "gift-fragment", quantity: 2 }] },
    { weight: 24, drops: [{ kind: "coins", quantity: 1 }, { kind: "gift-fragment", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 1 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }] },
    { weight: 12, drops: [{ kind: "gift-fragment", quantity: 1 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }] },
    { weight: 8, drops: [{ kind: "coupon", coupon: "off-10", quantity: 1 }] },
  ],
  rare: [
    { weight: 22, drops: [{ kind: "coins", quantity: 3 }, { kind: "gift-fragment", quantity: 2 }] },
    { weight: 22, drops: [{ kind: "coins", quantity: 2 }, { kind: "gift-fragment", quantity: 2 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 2 }, { kind: "gift-fragment", quantity: 1 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }] },
    { weight: 16, drops: [{ kind: "coins", quantity: 2 }, { kind: "chest-fragment", chest: "rare", quantity: 2 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
    { weight: 12, drops: [{ kind: "gift-fragment", quantity: 2 }, { kind: "chest-fragment", chest: "epic", quantity: 1 }, { kind: "coupon", coupon: "off-15", quantity: 1 }] },
    { weight: 10, drops: [{ kind: "coins", quantity: 4 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
  ],
  epic: [
    { weight: 24, drops: [{ kind: "coins", quantity: 5 }, { kind: "gift-fragment", quantity: 3 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 4 }, { kind: "gift-fragment", quantity: 2 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }, { kind: "coupon", coupon: "off-15", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 4 }, { kind: "gift-fragment", quantity: 2 }, { kind: "chest-fragment", chest: "legendary", quantity: 2 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 6 }, { kind: "gift-fragment", quantity: 2 }, { kind: "chest-fragment", chest: "legendary", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 3 }, { kind: "gift-fragment", quantity: 3 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
  ],
  legendary: [
    { weight: 24, drops: [{ kind: "coins", quantity: 10 }, { kind: "gift-fragment", quantity: 5 }, { kind: "chest-fragment", chest: "legendary", quantity: 3 }, { kind: "coupon", coupon: "off-20", quantity: 1 }] },
    { weight: 22, drops: [{ kind: "coins", quantity: 8 }, { kind: "gift-fragment", quantity: 5 }, { kind: "chest-fragment", chest: "mythic", quantity: 3 }, { kind: "chest-fragment", chest: "legendary", quantity: 2 }, { kind: "coupon", coupon: "off-20", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 7 }, { kind: "gift-fragment", quantity: 5 }, { kind: "chest-fragment", chest: "mythic", quantity: 3 }, { kind: "chest-fragment", chest: "legendary", quantity: 3 }, { kind: "coupon", coupon: "off-15", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 9 }, { kind: "gift-fragment", quantity: 4 }, { kind: "chest-fragment", chest: "mythic", quantity: 2 }, { kind: "chest-fragment", chest: "legendary", quantity: 3 }, { kind: "coupon", coupon: "off-20", quantity: 1 }] },
    { weight: 16, drops: [{ kind: "coins", quantity: 8 }, { kind: "gift-fragment", quantity: 6 }, { kind: "chest-fragment", chest: "mythic", quantity: 2 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }, { kind: "coupon", coupon: "off-20", quantity: 1 }] },
  ],
  mythic: [
    { weight: 22, drops: [{ kind: "coins", quantity: 20 }, { kind: "gift-fragment", quantity: 10 }, { kind: "chest-fragment", chest: "mythic", quantity: 8 }, { kind: "chest-fragment", chest: "legendary", quantity: 7 }, { kind: "coupon", coupon: "premium", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 18 }, { kind: "gift-fragment", quantity: 10 }, { kind: "chest-fragment", chest: "mythic", quantity: 9 }, { kind: "chest-fragment", chest: "legendary", quantity: 6 }, { kind: "coupon", coupon: "premium", quantity: 1 }, { kind: "coupon", coupon: "off-20", quantity: 1 }] },
    { weight: 18, drops: [{ kind: "coins", quantity: 16 }, { kind: "gift-fragment", quantity: 11 }, { kind: "chest-fragment", chest: "mythic", quantity: 10 }, { kind: "chest-fragment", chest: "legendary", quantity: 6 }, { kind: "chest-fragment", chest: "epic", quantity: 3 }, { kind: "coupon", coupon: "premium", quantity: 1 }, { kind: "coupon", coupon: "off-15", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 15 }, { kind: "gift-fragment", quantity: 10 }, { kind: "chest-fragment", chest: "mythic", quantity: 10 }, { kind: "chest-fragment", chest: "legendary", quantity: 7 }, { kind: "chest-fragment", chest: "epic", quantity: 2 }, { kind: "chest-fragment", chest: "rare", quantity: 1 }, { kind: "coupon", coupon: "premium", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
    { weight: 20, drops: [{ kind: "coins", quantity: 22 }, { kind: "gift-fragment", quantity: 9 }, { kind: "chest-fragment", chest: "mythic", quantity: 7 }, { kind: "chest-fragment", chest: "legendary", quantity: 6 }, { kind: "coupon", coupon: "premium", quantity: 1 }, { kind: "coupon", coupon: "off-10", quantity: 1 }] },
  ],
};

const PREVIEW_LABEL_BY_KIND: Record<LootSpec["kind"], string> = {
  coins: "Loot Coins",
  "gift-fragment": "Gift Card Fragments",
  "chest-fragment": "Chest Fragments",
  coupon: "Discount Coupons",
};

function getSpecValueUsd(spec: LootSpec): number {
  if (spec.kind === "coins") {
    return spec.quantity;
  }

  if (spec.kind === "gift-fragment") {
    return spec.quantity;
  }

  if (spec.kind === "chest-fragment") {
    return spec.quantity;
  }

  return COUPON_VALUE_USD[spec.coupon];
}

function bundleValueUsd(bundle: LootBundle): number {
  return bundle.drops.reduce((sum, spec) => sum + getSpecValueUsd(spec), 0);
}

function randomWeightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);

  if (total <= 0) {
    return 0;
  }

  const target = randomInt(0, total);
  let cursor = 0;

  for (let index = 0; index < weights.length; index += 1) {
    cursor += Math.max(0, weights[index] ?? 0);
    if (target < cursor) {
      return index;
    }
  }

  return Math.max(0, weights.length - 1);
}

function toInventoryItem(spec: Exclude<LootSpec, { kind: "coins" }>): InventoryItem {
  if (spec.kind === "gift-fragment") {
    return {
      id: "gift-card-fragment",
      name: "Gift Card Fragment",
      category: "Gift Card",
      description: "Collect 10 fragments to craft one $10 Gift Card.",
      quantity: spec.quantity,
      rarity: spec.quantity >= 6 ? "epic" : spec.quantity >= 3 ? "rare" : "uncommon",
      iconPath: "/itens/general/ticket.png",
    };
  }

  if (spec.kind === "chest-fragment") {
    const fragmentMeta = CHEST_FRAGMENT_META[spec.chest];
    return {
      id: fragmentMeta.id,
      name: fragmentMeta.name,
      category: "Chest Fragment",
      description: "Collect 20 fragments to craft the corresponding chest tier.",
      quantity: spec.quantity,
      rarity: fragmentMeta.rarity,
      iconPath: "/itens/general/ticket.png",
    };
  }

  const couponMeta = COUPON_META[spec.coupon];
  return {
    id: couponMeta.id,
    name: couponMeta.name,
    category: "Coupon",
    description: "Discount coupon obtained from chest opening.",
    quantity: 1,
    rarity: couponMeta.rarity,
    iconPath: "/itens/general/ticket.png",
  };
}

function validateBundles(): void {
  const chestIds = Object.keys(LOOT_BUNDLES) as ChestId[];

  for (const chestId of chestIds) {
    const bundles = LOOT_BUNDLES[chestId];
    const countRule = ITEM_COUNT_RULES[chestId];
    const targetValue = CHEST_EXPECTED_VALUE_USD[chestId];
    const tolerance = VALUE_TOLERANCE_USD[chestId];

    for (const bundle of bundles) {
      const count = bundle.drops.length;
      if (count < countRule.min || count > countRule.max) {
        throw new Error(`Invalid drop count for ${chestId}: expected ${countRule.min}-${countRule.max}, got ${count}.`);
      }

      const value = bundleValueUsd(bundle);
      if (Math.abs(value - targetValue) > tolerance) {
        throw new Error(`Invalid EV for ${chestId}: target ${targetValue}, got ${value}.`);
      }
    }
  }
}

validateBundles();

export function rollChestLoot(chestId: ChestId): {
  drops: ChestLootDrop[];
  itemCount: number;
  totalValueUsd: number;
} {
  const bundles = LOOT_BUNDLES[chestId];
  const selectedIndex = randomWeightedIndex(bundles.map((bundle) => bundle.weight));
  const selectedBundle = bundles[selectedIndex] ?? bundles[0];

  const drops: ChestLootDrop[] = selectedBundle.drops.map((spec) => {
    if (spec.kind === "coins") {
      return {
        kind: "coins",
        amount: spec.quantity,
        title: `${spec.quantity.toLocaleString("en-US")} Loot Coins`,
        valueUsd: getSpecValueUsd(spec),
      };
    }

    const item = toInventoryItem(spec);
    return {
      kind: "item",
      title: item.name,
      valueUsd: getSpecValueUsd(spec),
      item,
    };
  });

  return {
    drops,
    itemCount: selectedBundle.drops.length,
    totalValueUsd: bundleValueUsd(selectedBundle),
  };
}

export function getLootOddsForPreview(chestId: ChestId): Array<{ type: string; weight: number }> {
  const bundles = LOOT_BUNDLES[chestId] ?? [];
  const grouped = new Map<string, number>();
  let total = 0;

  for (const bundle of bundles) {
    for (const spec of bundle.drops) {
      const label = PREVIEW_LABEL_BY_KIND[spec.kind];
      const contribution = Math.max(0, bundle.weight) * Math.max(0, spec.quantity);
      grouped.set(label, (grouped.get(label) ?? 0) + contribution);
      total += contribution;
    }
  }

  if (total <= 0) {
    return [];
  }

  return Array.from(grouped.entries()).map(([type, value]) => ({
    type,
    weight: Math.max(1, Math.round((value / total) * 100)),
  }));
}
