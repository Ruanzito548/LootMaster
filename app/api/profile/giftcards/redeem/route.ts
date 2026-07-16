import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import { normalizeInventory, removeItemQuantity } from "@/lib/rpg-system";

type RedeemBody = {
  itemId?: string;
  email?: string;
  country?: string;
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

function isRedeemableGiftCard(item: InventoryItem): boolean {
  const category = item.category.trim().toLowerCase();
  const id = item.id.trim().toLowerCase();
  const name = item.name.trim().toLowerCase();

  if (category !== "gift card") {
    return false;
  }

  if (id === "gift-card-fragment" || name.includes("fragment")) {
    return false;
  }

  return item.quantity > 0;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token")) {
    return 401;
  }

  if (message.includes("Invalid") || message.includes("Missing")) {
    return 422;
  }

  if (message.includes("quantity") || message.includes("found")) {
    return 409;
  }

  if (message.includes("profile")) {
    return 404;
  }

  return 500;
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: RedeemBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as RedeemBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  const itemId = (body.itemId ?? "").trim();
  const targetEmail = (body.email ?? "").trim();
  const country = (body.country ?? "").trim();

  if (!itemId) {
    return Response.json({ error: "Missing gift card item id." }, { status: 422 });
  }

  if (!validateEmail(targetEmail)) {
    return Response.json({ error: "Invalid email." }, { status: 422 });
  }

  if (country.length < 2) {
    return Response.json({ error: "Invalid country." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const userSnapshot = await tx.get(userRef);

      if (!userSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const source = userSnapshot.data() as Record<string, unknown>;
      const profile = mapUserProfile(decodedToken.uid, source);
      const inventoryRaw = Array.isArray(source.inventory) ? source.inventory : [];
      const inventory = normalizeInventory(inventoryRaw.filter(isInventoryItem));
      const selectedItem = inventory.find((item) => item.id === itemId);

      if (!selectedItem) {
        throw new Error("Gift card not found in inventory.");
      }

      if (!isRedeemableGiftCard(selectedItem)) {
        throw new Error("Invalid gift card for redeem.");
      }

      const removed = removeItemQuantity(inventory, selectedItem.id, 1);
      if (!removed.ok) {
        throw new Error(removed.error ?? "Could not redeem gift card right now.");
      }

      const claimRef = adminDb.collection("giftcard-claims").doc();

      tx.set(
        claimRef,
        {
          uid: decodedToken.uid,
          username: profile.username,
          accountEmail: profile.email,
          giftCardItemId: selectedItem.id,
          giftCardTitle: selectedItem.name,
          giftCardRarity: selectedItem.rarity,
          redeemEmail: targetEmail,
          country,
          status: "open",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: null,
          completedByUid: null,
        },
        { merge: true },
      );

      tx.set(
        userRef,
        {
          inventory: removed.inventory,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "giftcard_redeem_requested",
        category: "inventory",
        description: `Redeem request created for ${selectedItem.name}.`,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        itemCategory: selectedItem.category,
        quantity: 1,
        rarity: selectedItem.rarity,
        origin: "profile:giftcard-redeem",
        status: "pending",
        tags: ["giftcard", "redeem", "claim"],
        metadata: {
          claimId: claimRef.id,
          redeemEmail: targetEmail,
          country,
        },
      });

      return {
        ok: true,
        claimId: claimRef.id,
        giftCardTitle: selectedItem.name,
      };
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not redeem gift card.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
