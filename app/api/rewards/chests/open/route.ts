import { randomInt } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getLiveChestSystemConfig } from "@/lib/chest-config";
import { CHEST_DEFINITIONS, getChestDefinition, type ChestDefinition, type ChestId, type ChestRewardType } from "@/lib/chests";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { applyXpGain, getInventorySlotLimitFromLevel, mergeItemIntoInventory } from "@/lib/rpg-system";

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
  xpGain: number;
  rpgXp: number;
  rpgLevel: number;
  inventorySlotLimit: number;
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

const GIFT_CARD_BRANDS = ["League of Legends", "Blizzard", "Steam", "Valorant", "PSN", "Xbox"] as const;

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function rollBrandedGiftCard(quantity: number): InventoryItem {
  const brand = GIFT_CARD_BRANDS[roll(GIFT_CARD_BRANDS.length)] ?? "Steam";
  const slug = slugify(brand);

  return {
    id: `gift-card-${slug}`,
    name: `Gift Card - ${brand}`,
    category: "Gift Card",
    description: `${brand} Gift Card obtained from chest rewards.`,
    quantity,
    rarity: quantity >= 2 ? "legendary" : "epic",
    iconPath: "/itens/general/ticket.png",
  };
}

function rollGiftCardFragment(min: number, max: number): InventoryItem {
  const amount = randomInRange(Math.max(1, min), Math.max(min, max));

  return {
    id: "gift-card-fragment",
    name: "Gift Card Fragment",
    category: "Gift Card",
    description: "Fragment used to craft a full Gift Card.",
    quantity: amount,
    rarity: amount >= 6 ? "epic" : amount >= 3 ? "rare" : "uncommon",
    iconPath: "/itens/general/ticket.png",
  };
}

async function rollAccountRewardFromMarket(tx: Transaction, adminDb: ReturnType<typeof getAdminDb>): Promise<InventoryItem | null> {
  const eligibleQuery = adminDb.collection("accounts-market").where("chestDropEnabled", "==", true).limit(80);
  const eligibleSnapshot = await tx.get(eligibleQuery);

  if (eligibleSnapshot.empty) {
    return null;
  }

  const weighted = eligibleSnapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      title: typeof data.title === "string" && data.title.trim() ? data.title : "Game Account",
      gameId: typeof data.gameId === "string" ? data.gameId : "unknown",
      serverName: typeof data.serverName === "string" ? data.serverName : "Global",
      weight: Math.max(1, Number.isFinite(data.chestDropWeight) ? Math.floor(Number(data.chestDropWeight)) : 1),
    };
  });

  const picked = pickWeighted(weighted);

  return {
    id: `reward-account-${picked.id}`,
    name: `Game Account - ${picked.title}`,
    category: "Account",
    description: `Marketplace account reward (${picked.gameId} / ${picked.serverName}).`,
    quantity: 1,
    rarity: "heirloom",
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
    const chestSystemConfig = await getLiveChestSystemConfig();
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
      const slotLimit = Math.max(mappedProfile.inventorySlotLimit, getInventorySlotLimitFromLevel(mappedProfile.rpgLevel || 1));

      let nextInventory = [...baseInventory];
      nextInventory = decrementChest(nextInventory, chestDefinition);

      const configProfile = chestSystemConfig.byChest[chestDefinition.id];
      const rewardType = pickWeighted(configProfile.rewardOdds).type;
      let nextLootCoins = mappedProfile.lootCoins;
      let reward: OpenChestReward;

      if (rewardType === "coins") {
        const amount = randomInRange(configProfile.coinRange.min, configProfile.coinRange.max);
        nextLootCoins = Math.round((nextLootCoins + amount) * 100) / 100;

        reward = {
          type: "coins",
          title: `${amount.toLocaleString("pt-BR")} Loot Coins`,
          rarity: chestDefinition.rarity,
          amount,
        };
      } else {
        let item: InventoryItem | null = null;

        if (chestDefinition.id === "rare") {
          item = rollGiftCardFragment(
            Math.max(1, configProfile.giftCardFragment.min || 1),
            Math.max(1, configProfile.giftCardFragment.max || 1),
          );
        } else if (chestDefinition.id === "epic") {
          item = rollGiftCardFragment(
            Math.max(1, configProfile.giftCardFragment.min || 1),
            Math.max(1, configProfile.giftCardFragment.max || 3),
          );
        } else if (chestDefinition.id === "legendary") {
          const qty = randomInRange(
            Math.max(1, configProfile.fullGiftCard.min || 1),
            Math.max(1, configProfile.fullGiftCard.max || 1),
          );
          item = rollBrandedGiftCard(qty);
        } else if (chestDefinition.id === "mythic") {
          const accountRollEnabled = configProfile.accountDrop.enabled;
          const accountDropWon = accountRollEnabled && roll(100) < configProfile.accountDrop.chancePercent;

          if (accountDropWon) {
            item = await rollAccountRewardFromMarket(tx, adminDb);
          }

          if (!item) {
            const qty = randomInRange(
              Math.max(1, configProfile.fullGiftCard.min || 2),
              Math.max(1, configProfile.fullGiftCard.max || 2),
            );
            item = rollBrandedGiftCard(qty);
          }
        } else {
          const fragmentDropWon = roll(100) < configProfile.giftCardFragment.chancePercent;
          if (fragmentDropWon && configProfile.giftCardFragment.max > 0) {
            item = rollGiftCardFragment(configProfile.giftCardFragment.min, configProfile.giftCardFragment.max);
          }
        }

        if (!item) {
          const amount = randomInRange(configProfile.coinRange.min, configProfile.coinRange.max);
          nextLootCoins = Math.round((nextLootCoins + amount) * 100) / 100;

          reward = {
            type: "coins",
            title: `${amount.toLocaleString("pt-BR")} Loot Coins`,
            rarity: chestDefinition.rarity,
            amount,
          };
        } else {
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
      }

      const responsePayload: OpenChestResponse = {
        ok: true,
        replayed: false,
        chestId: chestDefinition.id,
        reward,
        lootCoins: nextLootCoins,
        inventory: nextInventory,
        xpGain: 0,
        rpgXp: mappedProfile.rpgXp,
        rpgLevel: mappedProfile.rpgLevel,
        inventorySlotLimit: mappedProfile.inventorySlotLimit,
      };

      const xpGain = configProfile.xpGain;
      const progression = applyXpGain(mappedProfile.rpgXp ?? 0, xpGain);

      responsePayload.xpGain = xpGain;
      responsePayload.rpgXp = progression.xp;
      responsePayload.rpgLevel = progression.level;
      responsePayload.inventorySlotLimit = progression.slotLimit;

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
          actionLabel: "Opened Chest",
          sourceLabel: chestDefinition.title,
          resultLabel: reward.title,
          rewardType: reward.type,
          rewardTitle: reward.title,
          xpGain,
        },
      });

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "chest_used",
        category: "inventory",
        description: `Consumed 1 ${chestDefinition.title} from inventory.`,
        itemId: chestDefinition.inventoryItemId,
        itemName: chestDefinition.title,
        itemCategory: "Chest",
        quantity: 1,
        rarity: chestDefinition.rarity,
        origin: "chests:open",
        status: "consumed",
        tags: ["chest", "consumed", chestDefinition.rarity],
        metadata: {
          actionLabel: "Chest Used",
          sourceLabel: "Inventory",
          resultLabel: chestDefinition.title,
          chestId: chestDefinition.id,
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
