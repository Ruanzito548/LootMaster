import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  LEVEL_CAP,
  buildLevelReward,
  buildUnlockHistoryItem,
  calculateLevelProgress,
} from "@/lib/level-rewards";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import {
  getInventorySlotLimitFromLevel,
  mergeItemIntoInventory,
  normalizeInventory,
} from "@/lib/rpg-system";

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

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token") || message.includes("Unauthorized")) {
    return 401;
  }

  if (message.includes("Reach level") || message.includes("claimed") || message.includes("full")) {
    return 409;
  }

  if (message.includes("profile") || message.includes("not found")) {
    return 404;
  }

  return 500;
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);

    const result = await adminDb.runTransaction(async (tx) => {
      const userSnapshot = await tx.get(userRef);

      if (!userSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const source = userSnapshot.data() as Record<string, unknown>;
      const profile = mapUserProfile(decodedToken.uid, source);
      const progress = calculateLevelProgress(profile.totalSpentCents ?? 0);
      const currentRewardLevel =
        typeof source.highestRewardedLevel === "number" && Number.isFinite(source.highestRewardedLevel)
          ? source.highestRewardedLevel
          : profile.highestRewardedLevel;
      const nextClaimLevel = Math.max(2, Math.floor(currentRewardLevel) + 1);

      if (nextClaimLevel > LEVEL_CAP) {
        throw new Error("All rewards already claimed.");
      }

      if (progress.level < nextClaimLevel) {
        throw new Error(`Reach level ${nextClaimLevel} to claim this reward.`);
      }

      const reward = buildLevelReward(nextClaimLevel, `claim-${decodedToken.uid}-${nextClaimLevel}`);
      const slotLimit = Math.max(profile.inventorySlotLimit, getInventorySlotLimitFromLevel(profile.rpgLevel || 1));
      let nextInventory = normalizeInventory(
        (Array.isArray(source.inventory) ? source.inventory : []).filter(isInventoryItem),
      );

      for (const grantedItem of reward.grantedItems) {
        const merged = mergeItemIntoInventory(nextInventory, grantedItem, slotLimit);
        if (!merged.ok) {
          throw new Error(merged.error ?? "Inventory is full.");
        }
        nextInventory = merged.inventory;
      }

      const currentRewardsClaimed =
        typeof source.totalRewardsClaimed === "number" && Number.isFinite(source.totalRewardsClaimed)
          ? source.totalRewardsClaimed
          : profile.totalRewardsClaimed;
      const nowIso = new Date().toISOString();
      const storedUnlocks = Array.isArray(source.recentUnlocks)
        ? [...(source.recentUnlocks as unknown[])]
        : [];
      const nextUnlockHistory = [
        buildUnlockHistoryItem(reward, `claim-${nextClaimLevel}-${nowIso}`, nowIso),
        ...storedUnlocks,
      ].slice(0, 24);

      tx.set(
        userRef,
        {
          inventory: nextInventory,
          highestRewardedLevel: nextClaimLevel,
          totalRewardsClaimed: currentRewardsClaimed + 1,
          recentUnlocks: nextUnlockHistory,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "reward_item_received",
        category: "progression",
        description: `Claimed level ${nextClaimLevel} reward: ${reward.title}.`,
        itemId: reward.inventoryItem.id,
        itemName: reward.inventoryItem.name,
        itemCategory: reward.inventoryItem.category,
        quantity: reward.inventoryItem.quantity,
        rarity: reward.inventoryItem.rarity,
        origin: "battle-pass:claim-next",
        status: "completed",
        tags: ["progression", "reward", "claim", reward.inventoryItem.rarity],
        metadata: {
          level: nextClaimLevel,
          actionLabel: "Reward Claimed",
          sourceLabel: "Battle Pass",
          resultLabel: reward.title,
        },
      });

      return {
        ok: true,
        claimedLevel: nextClaimLevel,
        rewardTitle: reward.title,
        grantedItems: reward.grantedItems,
      };
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not claim reward.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
