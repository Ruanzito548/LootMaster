import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getChestDefinition, type ChestId } from "@/lib/chests";
import { CHEST_EXPECTED_VALUE_USD, rollChestLoot } from "@/lib/chest-loot";
import {
  applyChestEconomyReward,
  buildDefaultChestEconomyConfig,
  fundChestEconomyPools,
  resolveChestEconomyReward,
  sanitizeChestEconomyConfig,
  sanitizeChestEconomyState,
} from "@/lib/chest-economy";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { getInventorySlotLimitFromLevel, mergeItemIntoInventory } from "@/lib/rpg-system";

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
      const [userSnapshot, requestSnapshot, chestConfigSnapshot] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(adminDb.collection("app-config").doc("chest-system")),
      ]);

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

      const rolledLoot = rollChestLoot(chestDefinition.id);
      const chestConfig = chestConfigSnapshot.exists
        ? sanitizeChestEconomyConfig(chestConfigSnapshot.data()?.economy)
        : buildDefaultChestEconomyConfig();
      const chestEconomyState = sanitizeChestEconomyState(chestConfigSnapshot.data()?.economyState);
      let nextLootCoins = mappedProfile.lootCoins;
      const rewardParts: string[] = [];
      let totalCoins = 0;
      let singleInventoryReward: InventoryItem | undefined;
      let rewardEconomy: ReturnType<typeof resolveChestEconomyReward> | null = null;

      const rewardPoolState = fundChestEconomyPools(chestEconomyState, Math.max(0, Math.round(rolledLoot.totalValueUsd * 100)), chestConfig);
      rewardEconomy = resolveChestEconomyReward(chestDefinition.id, chestConfig, rewardPoolState, Math.random() * 100);

      if (rewardEconomy) {
        rewardParts.push(`${rewardEconomy.amountCents / 100} LC (${rewardEconomy.reason})`);
        nextLootCoins = Math.round((nextLootCoins + rewardEconomy.amountCents / 100) * 100) / 100;
        totalCoins += rewardEconomy.amountCents / 100;
      }

      for (const drop of rolledLoot.drops) {
        if (drop.kind === "coins") {
          totalCoins += drop.amount;
          nextLootCoins = Math.round((nextLootCoins + drop.amount) * 100) / 100;
          rewardParts.push(`${drop.amount.toLocaleString("en-US")} LC`);
          continue;
        }

        const merged = mergeItemIntoInventory(nextInventory, drop.item, slotLimit);

        if (!merged.ok) {
          throw new Error(merged.error ?? "Inventory is full.");
        }

        nextInventory = merged.inventory;
        rewardParts.push(`${drop.item.quantity}x ${drop.item.name}`);
        if (rolledLoot.drops.length === 1) {
          singleInventoryReward = drop.item;
        }
      }

      const reward: OpenChestReward = {
        type: rolledLoot.drops.length === 1 && rolledLoot.drops[0]?.kind === "coins" ? "coins" : "item",
        title: rewardParts.join(" + "),
        rarity: chestDefinition.rarity,
        ...(totalCoins > 0 ? { amount: totalCoins } : {}),
        ...(singleInventoryReward ? { inventoryItem: singleInventoryReward } : {}),
      };

      const xpGain = 0;

      const responsePayload: OpenChestResponse = {
        ok: true,
        replayed: false,
        chestId: chestDefinition.id,
        reward,
        lootCoins: nextLootCoins,
        inventory: nextInventory,
        xpGain,
        rpgXp: mappedProfile.rpgXp ?? 0,
        rpgLevel: mappedProfile.rpgLevel ?? 1,
        inventorySlotLimit: mappedProfile.inventorySlotLimit ?? slotLimit,
      };

      const nextEconomyState = rewardEconomy ? applyChestEconomyReward(rewardPoolState, rewardEconomy) : rewardPoolState;

      tx.set(
        userRef,
        {
          inventory: nextInventory,
          lootCoins: nextLootCoins,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        adminDb.collection("app-config").doc("chest-system"),
        {
          economy: chestConfig,
          economyState: nextEconomyState,
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
        economyReward: rewardEconomy,
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
          dropCount: rolledLoot.itemCount,
          rewardValueUsd: rolledLoot.totalValueUsd,
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
