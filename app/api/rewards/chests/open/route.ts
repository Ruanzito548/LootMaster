import { randomInt } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { CHEST_DEFINITIONS, CHEST_IDS, getChestDefinition, type ChestDefinition, type ChestId, type ChestRewardType } from "@/lib/chests";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";

type OpenChestBody = {
  chestId?: string;
  requestId?: string;
};

type OpenChestReward = {
  type: ChestRewardType;
  title: string;
  rarity: string;
  amount?: number;
  inventoryItem?: InventoryItem;
  chestId?: ChestId;
};

type OpenChestResponse = {
  ok: true;
  replayed: boolean;
  chestId: ChestId;
  reward: OpenChestReward;
  lootCoins: number;
  inventory: InventoryItem[];
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

const COSMETIC_POOL: Array<{ name: string; rarity: InventoryItem["rarity"]; iconPath: string }> = [
  { name: "Nebula Banner", rarity: "epic", iconPath: "/itens/general/ticket.png" },
  { name: "Astral Emblem", rarity: "legendary", iconPath: "/itens/general/ticket.png" },
  { name: "Void Crest", rarity: "artifact", iconPath: "/itens/general/ticket.png" },
  { name: "Eclipse Frame", rarity: "heirloom", iconPath: "/itens/general/ticket.png" },
];

const ITEM_NAME_BY_RARITY: Record<InventoryItem["rarity"], string[]> = {
  poor: ["Damaged Supply Pack"],
  common: ["Scout Supply", "Traveler Cache", "Basic Rune"],
  uncommon: ["Expedition Relic", "Green Sigil", "Ranger Token"],
  rare: ["Arcane Sigil", "Royal Voucher", "Rare Enchantment"],
  epic: ["Storm Glyph", "Heroic Insignia", "Epic Core"],
  legendary: ["Eternal Sigil", "Phoenix Crest", "Legend Core"],
  artifact: ["Ancient Relic", "Artifact Matrix", "Titan Fragment"],
  heirloom: ["Heirloom Rune", "Ancestral Mark", "Dynasty Core"],
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

function randomInRange(min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return min + roll(max - min + 1);
}

function clampQuantity(quantity: number): number {
  return Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
}

function chestRarityToInventoryRarity(rarity: ChestDefinition["rarity"]): InventoryItem["rarity"] {
  if (rarity === "mythic") {
    return "artifact";
  }

  return rarity;
}

function mergeInventoryItem(inventory: InventoryItem[], nextItem: InventoryItem): InventoryItem[] {
  const index = inventory.findIndex(
    (item) => item.name === nextItem.name && item.category === nextItem.category && item.rarity === nextItem.rarity,
  );

  if (index === -1) {
    return [...inventory, nextItem];
  }

  return inventory.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    return {
      ...item,
      quantity: clampQuantity(item.quantity) + clampQuantity(nextItem.quantity),
    };
  });
}

function incrementChest(inventory: InventoryItem[], chestId: ChestId, quantity = 1): InventoryItem[] {
  const chestDefinition = CHEST_DEFINITIONS[chestId];
  const index = inventory.findIndex((item) => item.id === chestDefinition.inventoryItemId);

  if (index === -1) {
    return [
      ...inventory,
      {
        id: chestDefinition.inventoryItemId,
        name: chestDefinition.inventoryItemName,
        category: "Chest",
        description: `${chestDefinition.title} used in rewards opening.`,
        quantity: clampQuantity(quantity),
        rarity: chestRarityToInventoryRarity(chestDefinition.rarity),
        iconPath: "/itens/general/ticket.png",
      },
    ];
  }

  return inventory.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    return {
      ...item,
      quantity: clampQuantity(item.quantity) + clampQuantity(quantity),
    };
  });
}

function decrementChest(inventory: InventoryItem[], chestDefinition: ChestDefinition): InventoryItem[] {
  const index = inventory.findIndex((item) => item.id === chestDefinition.inventoryItemId);

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

function rollItemReward(chestDefinition: ChestDefinition): InventoryItem {
  const rarityResult = pickWeighted(chestDefinition.itemRarityWeights);
  const itemNames = ITEM_NAME_BY_RARITY[rarityResult.rarity] ?? ITEM_NAME_BY_RARITY.common;
  const pickedName = itemNames[roll(itemNames.length)] ?? "Loot Item";

  return {
    id: `reward-item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: pickedName,
    category: "Loot",
    description: `Dropped from ${chestDefinition.title}.`,
    quantity: 1,
    rarity: rarityResult.rarity,
    iconPath: "/itens/general/ticket.png",
  };
}

function rollChestReward(currentChest: ChestId): ChestId {
  const entries = CHEST_IDS.map((id) => {
    const currentIndex = CHEST_IDS.indexOf(currentChest);
    const targetIndex = CHEST_IDS.indexOf(id);
    const distance = targetIndex - currentIndex;

    if (distance >= 2) {
      return { id, weight: 4 };
    }

    if (distance === 1) {
      return { id, weight: 13 };
    }

    if (distance === 0) {
      return { id, weight: 49 };
    }

    return { id, weight: 10 };
  });

  return pickWeighted(entries).id;
}

function rollCosmeticReward(): InventoryItem {
  const picked = COSMETIC_POOL[roll(COSMETIC_POOL.length)] ?? COSMETIC_POOL[0]!;

  return {
    id: `reward-cosmetic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: picked.name,
    category: "Cosmetic",
    description: "Exclusive cosmetic unlocked from chest opening.",
    quantity: 1,
    rarity: picked.rarity,
    iconPath: picked.iconPath,
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

  const chestIdInput = (body.chestId ?? "").trim().toLowerCase();
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
      const baseInventory = rawInventory.length > 0 ? strictInventory : [];

      let nextInventory = [...baseInventory];
      nextInventory = decrementChest(nextInventory, chestDefinition);

      const rewardType = pickWeighted(chestDefinition.rewardOdds).type;
      let nextLootCoins = mappedProfile.lootCoins;
      let reward: OpenChestReward;

      if (rewardType === "coins") {
        const amount = randomInRange(chestDefinition.coinRange.min, chestDefinition.coinRange.max);
        nextLootCoins = Math.round((nextLootCoins + amount) * 100) / 100;

        reward = {
          type: "coins",
          title: `${amount.toLocaleString("pt-BR")} Loot Coins`,
          rarity: chestDefinition.rarity,
          amount,
        };
      } else if (rewardType === "item") {
        const item = rollItemReward(chestDefinition);
        nextInventory = mergeInventoryItem(nextInventory, item);

        reward = {
          type: "item",
          title: item.name,
          rarity: item.rarity,
          inventoryItem: item,
        };
      } else if (rewardType === "chest") {
        const bonusChest = rollChestReward(chestDefinition.id);
        nextInventory = incrementChest(nextInventory, bonusChest, 1);

        reward = {
          type: "chest",
          title: `${CHEST_DEFINITIONS[bonusChest].title} x1`,
          rarity: CHEST_DEFINITIONS[bonusChest].rarity,
          chestId: bonusChest,
        };
      } else {
        const cosmetic = rollCosmeticReward();
        nextInventory = mergeInventoryItem(nextInventory, cosmetic);

        reward = {
          type: "cosmetic",
          title: cosmetic.name,
          rarity: cosmetic.rarity,
          inventoryItem: cosmetic,
        };
      }

      const responsePayload: OpenChestResponse = {
        ok: true,
        replayed: false,
        chestId: chestDefinition.id,
        reward,
        lootCoins: nextLootCoins,
        inventory: nextInventory,
      };

      tx.set(
        userRef,
        {
          inventory: nextInventory,
          lootCoins: nextLootCoins,
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
        reward,
        requestId,
        createdAt: FieldValue.serverTimestamp(),
      });

      return responsePayload;
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open chest.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
