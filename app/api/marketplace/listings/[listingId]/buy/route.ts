import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { applyXpGain, getInventorySlotLimitFromLevel, mergeItemIntoInventory, normalizeInventory } from "@/lib/rpg-system";

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

  if (message.includes("coins") || message.includes("sold") || message.includes("full") || message.includes("own listing")) {
    return 409;
  }

  return 500;
}

type Params = {
  params: Promise<{
    listingId: string;
  }>;
};

export async function POST(request: Request, { params }: Params): Promise<Response> {
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
    const buyerRef = adminDb.collection("users").doc(decodedToken.uid);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const listingSnapshot = await tx.get(listingRef);

      if (!listingSnapshot.exists) {
        throw new Error("Listing not found.");
      }

      const listing = listingSnapshot.data() as Record<string, unknown>;

      if (listing.status !== "active") {
        throw new Error("Listing already sold.");
      }

      if (listing.sellerUid === decodedToken.uid) {
        throw new Error("Cannot buy your own listing.");
      }

      const sellerUid = String(listing.sellerUid ?? "");
      const sellerRef = adminDb.collection("users").doc(sellerUid);

      const [buyerSnapshot, sellerSnapshot] = await Promise.all([tx.get(buyerRef), tx.get(sellerRef)]);

      if (!buyerSnapshot.exists || !sellerSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const buyerSource = buyerSnapshot.data() as Record<string, unknown>;
      const sellerSource = sellerSnapshot.data() as Record<string, unknown>;
      const buyer = mapUserProfile(decodedToken.uid, buyerSource);
      const seller = mapUserProfile(sellerUid, sellerSource);

      const buyerInventoryRaw = Array.isArray(buyerSource.inventory) ? buyerSource.inventory : [];
      const buyerInventory = normalizeInventory(buyerInventoryRaw.filter(isInventoryItem));

      const totalPrice = Number(listing.totalPrice ?? 0);
      const sellerReceives = Number(listing.sellerReceives ?? 0);
      const item = listing.item as InventoryItem;

      if (buyer.lootCoins < totalPrice) {
        throw new Error("Not enough loot coins.");
      }

      const slotLimit = Math.max(buyer.inventorySlotLimit, getInventorySlotLimitFromLevel(buyer.rpgLevel || 1));
      const merged = mergeItemIntoInventory(buyerInventory, item, slotLimit);
      if (!merged.ok) {
        throw new Error(merged.error ?? "Inventory is full.");
      }

      const buyerXp = applyXpGain(buyer.rpgXp ?? 0, Math.max(6, Math.floor(totalPrice * 0.012)));
      const sellerXp = applyXpGain(seller.rpgXp ?? 0, Math.max(8, Math.floor(totalPrice * 0.015)));

      tx.set(
        buyerRef,
        {
          inventory: merged.inventory,
          lootCoins: Math.max(0, Math.floor(buyer.lootCoins - totalPrice)),
          rpgXp: buyerXp.xp,
          rpgLevel: buyerXp.level,
          inventorySlotLimit: buyerXp.slotLimit,
          marketplaceBuys: (buyer.marketplaceBuys ?? 0) + 1,
          marketplaceVolume: (buyer.marketplaceVolume ?? 0) + totalPrice,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        sellerRef,
        {
          lootCoins: Math.floor(seller.lootCoins + sellerReceives),
          rpgXp: sellerXp.xp,
          rpgLevel: sellerXp.level,
          inventorySlotLimit: sellerXp.slotLimit,
          marketplaceSales: (seller.marketplaceSales ?? 0) + 1,
          marketplaceVolume: (seller.marketplaceVolume ?? 0) + totalPrice,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        listingRef,
        {
          status: "sold",
          buyerUid: decodedToken.uid,
          soldAtMs: Date.now(),
          soldAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(adminDb.collection("marketplace-sales").doc(), {
        listingId: id,
        sellerUid,
        buyerUid: decodedToken.uid,
        item,
        quantity: Number(listing.quantity ?? 1),
        totalPrice,
        createdAtMs: Date.now(),
        createdAt: FieldValue.serverTimestamp(),
      });

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "marketplace_item_bought",
        category: "marketplace",
        description: `Bought ${item.name} x${item.quantity} from ${seller.username} for ${totalPrice.toLocaleString("en-US")} Loot Coins.`,
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        quantity: item.quantity,
        value: totalPrice,
        valueUnit: "loot",
        relatedUserUid: sellerUid,
        relatedUserName: seller.username,
        rarity: item.rarity,
        origin: "marketplace:buy-listing",
        status: "completed",
        tags: ["marketplace", "buy", item.rarity],
        metadata: {
          listingId: id,
        },
      });

      writeActivityLog(tx, adminDb, {
        userUid: sellerUid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "marketplace_item_sold",
        category: "marketplace",
        description: `Sold ${item.name} x${item.quantity} to ${buyer.username} for ${totalPrice.toLocaleString("en-US")} Loot Coins and received ${sellerReceives.toLocaleString("en-US")} after fees.`,
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        quantity: item.quantity,
        value: sellerReceives,
        valueUnit: "loot",
        relatedUserUid: decodedToken.uid,
        relatedUserName: buyer.username,
        rarity: item.rarity,
        origin: "marketplace:buy-listing",
        status: "completed",
        tags: ["marketplace", "sale", item.rarity],
        metadata: {
          grossValue: totalPrice,
          listingId: id,
        },
      });

      writeActivityLog(tx, adminDb, {
        userUid: sellerUid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "marketplace_fee_charged",
        category: "marketplace",
        description: `Marketplace fee charged on sale of ${item.name}.`,
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        quantity: item.quantity,
        value: Math.max(0, totalPrice - sellerReceives),
        valueUnit: "loot",
        relatedUserUid: decodedToken.uid,
        relatedUserName: buyer.username,
        rarity: item.rarity,
        origin: "marketplace:buy-listing",
        status: "completed",
        tags: ["marketplace", "fee"],
        metadata: {
          listingId: id,
        },
      });

      return {
        ok: true,
        listingId: id,
        totalPrice,
      };
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not buy listing.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
