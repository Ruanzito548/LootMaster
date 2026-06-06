import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import {
  applyXpGain,
  calculateMarketplaceFee,
  calculateMarketplaceReceive,
  MARKETPLACE_MIN_PRICE,
  mergeItemIntoInventory,
  normalizeInventory,
  removeItemQuantity,
} from "@/lib/rpg-system";

type CreateListingBody = {
  itemId?: string;
  quantity?: number;
  unitPrice?: number;
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

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token")) {
    return 401;
  }

  if (message.includes("price") || message.includes("Invalid") || message.includes("quantity")) {
    return 422;
  }

  if (message.includes("Insufficient") || message.includes("full") || message.includes("coins")) {
    return 409;
  }

  if (message.includes("profile") || message.includes("Listing")) {
    return 404;
  }

  return 500;
}

function isMissingIndexError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const text = error.message.toLowerCase();
  return text.includes("failed_precondition") || text.includes("requires an index");
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedUserRequest(request);
    const adminDb = getAdminDb();

    const latestSalesPromise = adminDb.collection("marketplace-sales").orderBy("createdAtMs", "desc").limit(80).get();

    let activeSnapshot;

    try {
      activeSnapshot = await adminDb
        .collection("marketplace-listings")
        .where("status", "==", "active")
        .orderBy("createdAtMs", "desc")
        .limit(120)
        .get();
    } catch (error) {
      if (!isMissingIndexError(error)) {
        throw error;
      }

      // Fallback path for environments where the composite index is not created yet.
      // This keeps the marketplace usable while still returning recent active listings.
      const broadSnapshot = await adminDb.collection("marketplace-listings").orderBy("createdAtMs", "desc").limit(320).get();

      const filteredDocs = broadSnapshot.docs
        .filter((doc) => (doc.data() as Record<string, unknown>).status === "active")
        .slice(0, 120);

      activeSnapshot = {
        docs: filteredDocs,
      } as { docs: typeof filteredDocs };
    }

    const latestSalesSnapshot = await latestSalesPromise;

    const listings = activeSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    const salesHistory = latestSalesSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));

    return Response.json({ ok: true, listings, salesHistory, minPrice: MARKETPLACE_MIN_PRICE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load marketplace listings.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: CreateListingBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as CreateListingBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  const itemId = (body.itemId ?? "").trim();
  const quantity = Math.max(1, Math.min(9999, Math.floor(body.quantity ?? 1)));
  const unitPrice = Math.floor(body.unitPrice ?? 0);

  if (!itemId) {
    return Response.json({ error: "Invalid item id." }, { status: 422 });
  }

  if (!Number.isFinite(unitPrice) || unitPrice < MARKETPLACE_MIN_PRICE) {
    return Response.json({ error: `Minimum listing price is ${MARKETPLACE_MIN_PRICE}.` }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const listingRef = adminDb.collection("marketplace-listings").doc();

    const txResult = await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(userRef);

      if (!snapshot.exists) {
        throw new Error("User profile not found.");
      }

      const source = snapshot.data() as Record<string, unknown>;
      const profile = mapUserProfile(decodedToken.uid, source);
      const inventoryRaw = Array.isArray(source.inventory) ? source.inventory : [];
      const inventory = normalizeInventory(inventoryRaw.filter(isInventoryItem));

      const targetItem = inventory.find((entry) => entry.id === itemId);
      if (!targetItem) {
        throw new Error("Item not found in inventory.");
      }

      const removed = removeItemQuantity(inventory, itemId, quantity);
      if (!removed.ok) {
        throw new Error(removed.error ?? "Could not reserve item quantity.");
      }

      const totalPrice = unitPrice * quantity;
      const fee = calculateMarketplaceFee(totalPrice);
      const sellerReceives = calculateMarketplaceReceive(totalPrice);
      const xpGain = Math.max(4, Math.floor(totalPrice * 0.01));
      const progression = applyXpGain(profile.rpgXp ?? 0, xpGain);

      tx.set(
        listingRef,
        {
          sellerUid: decodedToken.uid,
          sellerName: profile.username,
          item: {
            ...targetItem,
            quantity,
          },
          quantity,
          unitPrice,
          totalPrice,
          fee,
          sellerReceives,
          rarity: targetItem.rarity,
          status: "active",
          createdAtMs: Date.now(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        userRef,
        {
          inventory: removed.inventory,
          rpgXp: progression.xp,
          rpgLevel: progression.level,
          inventorySlotLimit: progression.slotLimit,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        ok: true,
        listingId: listingRef.id,
        totalPrice,
        fee,
        sellerReceives,
      };
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create listing.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
