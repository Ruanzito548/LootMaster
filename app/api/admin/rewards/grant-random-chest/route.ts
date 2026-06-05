import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { CHEST_IDS, CHEST_DEFINITIONS, type ChestId } from "@/lib/chests";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";

type GrantRandomChestResponse = {
  ok: true;
  chestId: ChestId;
  chestTitle: string;
  quantity: number;
};

function clampQuantity(quantity: number): number {
  return Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
}

function chestRarityToInventoryRarity(rarity: ChestId): InventoryItem["rarity"] {
  if (rarity === "mythic") {
    return "artifact";
  }

  return rarity;
}

function pickRandomChestId(): ChestId {
  return CHEST_IDS[Math.floor(Math.random() * CHEST_IDS.length)]!;
}

function incrementChestInInventory(inventory: InventoryItem[], chestId: ChestId): { inventory: InventoryItem[]; quantity: number } {
  const chestDefinition = CHEST_DEFINITIONS[chestId];
  const index = inventory.findIndex((item) => item.id === chestDefinition.inventoryItemId);

  if (index === -1) {
    return {
      inventory: [
        ...inventory,
        {
          id: chestDefinition.inventoryItemId,
          name: chestDefinition.inventoryItemName,
          category: "Chest",
          description: `${chestDefinition.title} used in rewards opening.`,
          quantity: 1,
          rarity: chestRarityToInventoryRarity(chestDefinition.id),
          iconPath: "/itens/general/ticket.png",
        },
      ],
      quantity: 1,
    };
  }

  const nextQuantity = clampQuantity(inventory[index]!.quantity) + 1;

  return {
    inventory: inventory.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return {
        ...item,
        quantity: nextQuantity,
      };
    }),
    quantity: nextQuantity,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedAdminRequest(request);
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const selectedChestId = pickRandomChestId();
    const selectedChest = CHEST_DEFINITIONS[selectedChestId];

    const result = await adminDb.runTransaction<GrantRandomChestResponse>(async (tx) => {
      const snapshot = await tx.get(userRef);

      if (!snapshot.exists) {
        throw new Error("User profile not found.");
      }

      const profile = mapUserProfile(decodedToken.uid, snapshot.data() as Record<string, unknown>);
      const updated = incrementChestInInventory(profile.inventory, selectedChestId);

      tx.set(
        userRef,
        {
          inventory: updated.inventory,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        ok: true,
        chestId: selectedChestId,
        chestTitle: selectedChest.title,
        quantity: updated.quantity,
      };
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant random chest.";
    const status =
      message.includes("authorization") || message.includes("token")
        ? 401
        : message.includes("profile")
        ? 404
        : 500;

    return Response.json({ error: message }, { status });
  }
}
