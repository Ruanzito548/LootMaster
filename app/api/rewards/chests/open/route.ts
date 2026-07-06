import { randomInt } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getChestDefinition, type ChestId } from "@/lib/chests";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { applyXpGain, getInventorySlotLimitFromLevel, mergeItemIntoInventory } from "@/lib/rpg-system";

type OpenChestBody = {
  chestId?: string;
  requestId?: string;
};

type OpenChestReward = {
  type: "coins" | "item";
  title: string;
  rarity: string;
  amount?: number;
  inventoryItem?: InventoryItem;
};

type OpenChestResponse = {
  ok: true;
  replayed: boolean;
  chestId: ChestId;
  reward: OpenChestReward;
  lootCoins: number;
  inventory: InventoryItem[];
  xpGain: number;
  rpgXp: number;
  rpgLevel: number;
  inventorySlotLimit: number;
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const LC_PER_USD = 20;

const CHEST_EXPECTED_VALUE_USD: Record<ChestId, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 20,
  mythic: 50,
};

const XP_GAIN_BY_CHEST: Record<ChestId, number> = {
  common: 4,
  uncommon: 6,
  rare: 10,
  epic: 14,
  legendary: 18,
  mythic: 24,
};

type LootEntry =
  | { kind: "coins"; weight: number; lcMin: number; lcMax: number }
  | { kind: "gift-fragment"; weight: number; min: number; max: number }
  | { kind: "chest-fragment"; weight: number; fragmentId: string; fragmentName: string; rarity: InventoryItem["rarity"]; min: number; max: number }
  | { kind: "coupon"; weight: number; maxPercent: number; rarity: InventoryItem["rarity"] };

const LOOT_TABLES: Record<ChestId, LootEntry[]> = {
  common: [
    { kind: "coins", weight: 55, lcMin: 8, lcMax: 26 },
    { kind: "gift-fragment", weight: 25, min: 1, max: 2 },
    { kind: "chest-fragment", weight: 14, fragmentId: "fragment-chest-uncommon", fragmentName: "Uncommon Chest Fragment", rarity: "common", min: 1, max: 2 },
    { kind: "coupon", weight: 5, maxPercent: 5, rarity: "uncommon" },
    { kind: "chest-fragment", weight: 1, fragmentId: "fragment-chest-rare", fragmentName: "Rare Chest Fragment", rarity: "rare", min: 1, max: 1 },
  ],
  uncommon: [
    { kind: "coins", weight: 48, lcMin: 20, lcMax: 46 },
    { kind: "gift-fragment", weight: 25, min: 2, max: 3 },
    { kind: "chest-fragment", weight: 18, fragmentId: "fragment-chest-rare", fragmentName: "Rare Chest Fragment", rarity: "rare", min: 1, max: 2 },
    { kind: "coupon", weight: 7, maxPercent: 5, rarity: "rare" },
    { kind: "chest-fragment", weight: 2, fragmentId: "fragment-chest-epic", fragmentName: "Epic Chest Fragment", rarity: "epic", min: 1, max: 1 },
  ],
  rare: [
    { kind: "coins", weight: 45, lcMin: 56, lcMax: 112 },
    { kind: "gift-fragment", weight: 25, min: 3, max: 5 },
    { kind: "chest-fragment", weight: 20, fragmentId: "fragment-chest-epic", fragmentName: "Epic Chest Fragment", rarity: "epic", min: 1, max: 2 },
    { kind: "coupon", weight: 8, maxPercent: 10, rarity: "epic" },
    { kind: "chest-fragment", weight: 2, fragmentId: "fragment-chest-legendary", fragmentName: "Legendary Chest Fragment", rarity: "legendary", min: 1, max: 1 },
  ],
  epic: [
    { kind: "coins", weight: 40, lcMin: 120, lcMax: 240 },
    { kind: "gift-fragment", weight: 26, min: 5, max: 8 },
    { kind: "chest-fragment", weight: 22, fragmentId: "fragment-chest-legendary", fragmentName: "Legendary Chest Fragment", rarity: "legendary", min: 1, max: 2 },
    { kind: "coupon", weight: 9, maxPercent: 15, rarity: "legendary" },
    { kind: "chest-fragment", weight: 3, fragmentId: "fragment-chest-mythic", fragmentName: "Mythic Chest Fragment", rarity: "artifact", min: 1, max: 1 },
  ],
  legendary: [
    { kind: "coins", weight: 38, lcMin: 260, lcMax: 480 },
    { kind: "gift-fragment", weight: 30, min: 8, max: 12 },
    { kind: "chest-fragment", weight: 20, fragmentId: "fragment-chest-mythic", fragmentName: "Mythic Chest Fragment", rarity: "artifact", min: 2, max: 3 },
    { kind: "coupon", weight: 12, maxPercent: 20, rarity: "legendary" },
  ],
  mythic: [
    { kind: "coins", weight: 34, lcMin: 700, lcMax: 1200 },
    { kind: "gift-fragment", weight: 32, min: 15, max: 24 },
    { kind: "chest-fragment", weight: 22, fragmentId: "fragment-chest-mythic", fragmentName: "Mythic Chest Fragment", rarity: "artifact", min: 4, max: 8 },
    { kind: "coupon", weight: 12, maxPercent: 25, rarity: "artifact" },
  ],
};

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

function roll(range: number): number {
  return randomInt(0, range);
}

function randomInRange(min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return min + roll(max - min + 1);
}

function pickWeighted<T extends { weight: number }>(pool: T[]): T {
  const total = pool.reduce((sum, item) => sum + Math.max(0, item.weight), 0);

  if (total <= 0) {
    return pool[0]!;
  }

  const target = roll(total);
  let cursor = 0;

  for (const entry of pool) {
    cursor += Math.max(0, entry.weight);
    if (target < cursor) {
      return entry;
    }
  }

  return pool[pool.length - 1]!;
}

function clampQuantity(quantity: number): number {
  return Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
}

function decrementChest(inventory: InventoryItem[], chestItemId: string): InventoryItem[] {
  const index = inventory.findIndex((item) => item.id === chestItemId);

  if (index === -1) {
    throw new Error("Chest not found in inventory.");
  }

  const currentItem = inventory[index]!;
  const currentQuantity = clampQuantity(currentItem.quantity);

  if (currentQuantity <= 0) {
    throw new Error("You do not have available chest quantity.");
  }

  if (currentQuantity === 1) {
    return inventory.filter((_, itemIndex) => itemIndex !== index);
  }

  return inventory.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    return {
      ...item,
      quantity: currentQuantity - 1,
    };
  });
}

function buildItemFromEntry(entry: LootEntry): InventoryItem {
  if (entry.kind === "gift-fragment") {
    const amount = randomInRange(entry.min, entry.max);

    return {
      id: "gift-card-fragment",
      name: "Gift Card Fragment",
      category: "Gift Card",
      description: "Fragment used to craft one Gift Card.",
      quantity: amount,
      rarity: amount >= 8 ? "epic" : amount >= 4 ? "rare" : "uncommon",
      iconPath: "/itens/general/ticket.png",
    };
  }

  if (entry.kind === "chest-fragment") {
    const amount = randomInRange(entry.min, entry.max);

    return {
      id: entry.fragmentId,
      name: entry.fragmentName,
      category: "Chest Fragment",
      description: "Collect 20 to craft the corresponding chest tier.",
      quantity: amount,
      rarity: entry.rarity,
      iconPath: "/itens/general/ticket.png",
    };
  }

  if (entry.kind !== "coupon") {
    throw new Error("Invalid loot table entry.");
  }

  const couponPercent = randomInRange(Math.max(2, Math.floor(entry.maxPercent / 2)), entry.maxPercent);

  return {
    id: `coupon-off-${couponPercent}`,
    name: `${couponPercent}% OFF Coupon`,
    category: "Coupon",
    description: "Discount coupon obtained from chest opening.",
    quantity: 1,
    rarity: entry.rarity,
    iconPath: "/itens/general/ticket.png",
  };
}

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token")) {
    return 401;
  }

  if (message.includes("request") || message.includes("payload")) {
    return 422;
  }

  if (message.includes("Chest not found") || message.includes("available chest quantity")) {
    return 409;
  }

  if (message.includes("profile")) {
    return 404;
  }

  return 500;
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: OpenChestBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as OpenChestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  const chestIdInput = (body.chestId ?? "").trim().toLowerCase() as ChestId;
  const requestId = (body.requestId ?? "").trim();

  if (!REQUEST_ID_PATTERN.test(requestId)) {
    return Response.json({ error: "Invalid request id." }, { status: 422 });
  }

  const chestDefinition = getChestDefinition(chestIdInput);

  if (!chestDefinition) {
    return Response.json({ error: "Invalid chest id." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const requestRef = userRef.collection("chest-open-requests").doc(requestId);
    const historyRef = adminDb.collection("reward-history").doc();

    const txResult = await adminDb.runTransaction<OpenChestResponse>(async (tx) => {
      const [userSnapshot, requestSnapshot] = await Promise.all([tx.get(userRef), tx.get(requestRef)]);

      if (requestSnapshot.exists) {
        const payload = requestSnapshot.data() as OpenChestResponse;
        return {
          ...payload,
          replayed: true,
        };
      }

      if (!userSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const userData = userSnapshot.data() as Record<string, unknown>;
      const mappedProfile = mapUserProfile(decodedToken.uid, userData);
      const rawInventory = Array.isArray(userData.inventory) ? userData.inventory : [];
      const strictInventory = rawInventory.filter(isInventoryItem);
      const slotLimit = Math.max(mappedProfile.inventorySlotLimit, getInventorySlotLimitFromLevel(mappedProfile.rpgLevel || 1));

      let nextInventory = decrementChest(strictInventory, chestDefinition.inventoryItemId);

      const lootEntry = pickWeighted(LOOT_TABLES[chestDefinition.id]);
      let nextLootCoins = mappedProfile.lootCoins;
      let reward: OpenChestReward;

      if (lootEntry.kind === "coins") {
        const amount = randomInRange(lootEntry.lcMin, lootEntry.lcMax);
        nextLootCoins = Math.round((nextLootCoins + amount) * 100) / 100;

        reward = {
          type: "coins",
          title: `${amount.toLocaleString("en-US")} Loot Coins`,
          rarity: chestDefinition.rarity,
          amount,
        };
      } else {
        const item = buildItemFromEntry(lootEntry);
        const merged = mergeItemIntoInventory(nextInventory, item, slotLimit);

        if (!merged.ok) {
          throw new Error(merged.error ?? "Inventory is full.");
        }

        nextInventory = merged.inventory;

        reward = {
          type: "item",
          title: item.name,
          rarity: item.rarity,
          inventoryItem: item,
        };
      }

      const xpGain = XP_GAIN_BY_CHEST[chestDefinition.id];
      const progression = applyXpGain(mappedProfile.rpgXp ?? 0, xpGain);

      const responsePayload: OpenChestResponse = {
        ok: true,
        replayed: false,
        chestId: chestDefinition.id,
        reward,
        lootCoins: nextLootCoins,
        inventory: nextInventory,
        xpGain,
        rpgXp: progression.xp,
        rpgLevel: progression.level,
        inventorySlotLimit: progression.slotLimit,
      };

      tx.set(
        userRef,
        {
          inventory: nextInventory,
          lootCoins: nextLootCoins,
          rpgXp: progression.xp,
          rpgLevel: progression.level,
          inventorySlotLimit: progression.slotLimit,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(requestRef, {
        ...responsePayload,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(historyRef, {
        uid: decodedToken.uid,
        email: decodedToken.email ?? "",
        chestId: chestDefinition.id,
        chestRarity: chestDefinition.rarity,
        chestExpectedUsd: CHEST_EXPECTED_VALUE_USD[chestDefinition.id],
        reward,
        requestId,
        createdAt: FieldValue.serverTimestamp(),
      });

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "chest_opened",
        category: "chests",
        description: `Opened ${chestDefinition.title} and received ${reward.title}.`,
        itemId: chestDefinition.inventoryItemId,
        itemName: chestDefinition.inventoryItemName,
        itemCategory: "Chest",
        quantity: 1,
        rarity: chestDefinition.rarity,
        origin: "chests:open",
        status: "completed",
        tags: ["chest", "opened", chestDefinition.rarity],
        metadata: {
          requestId,
          rewardType: reward.type,
          rewardTitle: reward.title,
          chestExpectedUsd: CHEST_EXPECTED_VALUE_USD[chestDefinition.id],
          xpGain,
        },
      });

      return responsePayload;
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open chest.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
