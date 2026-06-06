import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { getInventorySlotLimitFromLevel, mergeItemIntoInventory, normalizeInventory } from "@/lib/rpg-system";

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
  if (message.includes("authorization") || message.includes("token")) {
    return 401;
  }

  if (message.includes("Listing") || message.includes("profile") || message.includes("User profile")) {
    return 404;
  }

  if (message.includes("already sold") || message.includes("not your listing") || message.includes("full")) {
    return 409;
  }

  return 500;
}

type Params = {
  params: Promise<{
    listingId: string;
  }>;
};

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  try {
    const { listingId } = await params;
    const id = listingId.trim();

    if (!id) {
      return Response.json({ error: "Listing id is required." }, { status: 422 });
    }

    const adminDb = getAdminDb();
    const listingRef = adminDb.collection("marketplace-listings").doc(id);
    const userRef = adminDb.collection("users").doc(decodedToken.uid);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const [listingSnapshot, userSnapshot] = await Promise.all([tx.get(listingRef), tx.get(userRef)]);

      if (!listingSnapshot.exists) {
        throw new Error("Listing not found.");
      }

      if (!userSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const listing = listingSnapshot.data() as Record<string, unknown>;

      if (listing.status !== "active") {
        throw new Error("Listing already sold or cancelled.");
      }

      if (listing.sellerUid !== decodedToken.uid) {
        throw new Error("This is not your listing.");
      }

      const source = userSnapshot.data() as Record<string, unknown>;
      const profile = mapUserProfile(decodedToken.uid, source);
      const inventoryRaw = Array.isArray(source.inventory) ? source.inventory : [];
      const inventory = normalizeInventory(inventoryRaw.filter(isInventoryItem));
      const item = listing.item as InventoryItem;

      const slotLimit = Math.max(profile.inventorySlotLimit, getInventorySlotLimitFromLevel(profile.rpgLevel || 1));
      const merged = mergeItemIntoInventory(inventory, item, slotLimit);
      if (!merged.ok) {
        throw new Error(merged.error ?? "Inventory is full.");
      }

      tx.set(
        userRef,
        {
          inventory: merged.inventory,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        listingRef,
        {
          status: "cancelled",
          cancelledAtMs: Date.now(),
          cancelledAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "marketplace_listing_removed",
        category: "marketplace",
        description: `Removed marketplace listing and returned ${item.name} x${item.quantity} to inventory.`,
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        quantity: item.quantity,
        rarity: item.rarity,
        origin: "marketplace:cancel-listing",
        status: "cancelled",
        tags: ["marketplace", "cancelled", item.rarity],
        metadata: {
          listingId: id,
        },
      });

      return {
        ok: true,
        listingId: id,
      };
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel listing.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
