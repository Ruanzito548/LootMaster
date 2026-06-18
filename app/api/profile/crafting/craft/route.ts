import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapUserProfile, type InventoryItem } from "@/lib/profile-data";
import {
  applyXpGain,
  CRAFT_RECIPES,
  getCraftRecipe,
  getInventorySlotLimitFromLevel,
  getItemQuantity,
  mergeItemIntoInventory,
  normalizeInventory,
  removeItemQuantity,
} from "@/lib/rpg-system";

type CraftBody = {
  recipeId?: string;
  quantity?: number;
};

const GIFT_CARD_BRANDS = ["League of Legends", "Blizzard", "Steam", "Valorant", "PSN", "Xbox"] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildGiftCardOutput(quantity: number): InventoryItem {
  const brand = GIFT_CARD_BRANDS[Math.floor(Math.random() * GIFT_CARD_BRANDS.length)] ?? "Steam";
  const slug = slugify(brand);

  return {
    id: `gift-card-${slug}`,
    name: `Gift Card - ${brand}`,
    category: "Gift Card",
    description: `${brand} Gift Card crafted at the workshop forge.`,
    quantity,
    rarity: "epic",
    iconPath: "/itens/general/ticket.png",
  };
}

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

  if (message.includes("Invalid") || message.includes("recipe")) {
    return 422;
  }

  if (message.includes("Insufficient") || message.includes("full")) {
    return 409;
  }

  if (message.includes("profile")) {
    return 404;
  }

  return 500;
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: CraftBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as CraftBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  const recipeId = (body.recipeId ?? "").trim();
  const quantity = Math.max(1, Math.min(10, Math.floor(body.quantity ?? 1)));
  const recipe = getCraftRecipe(recipeId);

  if (!recipe) {
    return Response.json({ error: "Invalid recipe id." }, { status: 422 });
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

      let nextInventory = [...inventory];

      for (const material of recipe.materials) {
        const required = material.quantity * quantity;
        if (getItemQuantity(nextInventory, material.itemId) < required) {
          throw new Error(`Insufficient material: ${material.name}.`);
        }
      }

      const totalCoinCost = Math.max(0, Math.floor((recipe.coinCost ?? 0) * quantity));
      if ((profile.lootCoins ?? 0) < totalCoinCost) {
        throw new Error("Insufficient loot coins for crafting cost.");
      }

      for (const material of recipe.materials) {
        const required = material.quantity * quantity;
        const removed = removeItemQuantity(nextInventory, material.itemId, required);
        if (!removed.ok) {
          throw new Error(removed.error ?? "Could not consume crafting material.");
        }
        nextInventory = removed.inventory;
      }

      const output: InventoryItem =
        recipe.id === "craft-gift-card"
          ? buildGiftCardOutput(recipe.outputItem.quantity * quantity)
          : {
              ...recipe.outputItem,
              quantity: recipe.outputItem.quantity * quantity,
              description: `${recipe.title} crafted at the forge.`,
            };

      const slotLimit = Math.max(profile.inventorySlotLimit, getInventorySlotLimitFromLevel(profile.rpgLevel || 1));
      const merged = mergeItemIntoInventory(nextInventory, output, slotLimit);
      if (!merged.ok) {
        throw new Error(merged.error ?? "Inventory is full.");
      }

      nextInventory = merged.inventory;

      const xpGain = recipe.xpGain * quantity;
      const progression = applyXpGain(profile.rpgXp ?? 0, xpGain);

      tx.set(
        userRef,
        {
          inventory: nextInventory,
          lootCoins: Math.max(0, Math.floor((profile.lootCoins ?? 0) - totalCoinCost)),
          rpgXp: progression.xp,
          rpgLevel: progression.level,
          inventorySlotLimit: progression.slotLimit,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(adminDb.collection("craft-history").doc(), {
        uid: decodedToken.uid,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        quantity,
        xpGain,
        createdAt: FieldValue.serverTimestamp(),
      });

      const totalMaterialsConsumed = recipe.materials.reduce((sum, material) => sum + material.quantity * quantity, 0);

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "craft_completed",
        category: "crafting",
        description: `Crafted ${output.name} x${output.quantity} from recipe ${recipe.title}.`,
        itemId: output.id,
        itemName: output.name,
        itemCategory: output.category,
        quantity: output.quantity,
        value: xpGain,
        valueUnit: "xp",
        rarity: output.rarity,
        origin: "crafting:craft",
        status: "completed",
        tags: ["crafting", "crafted", output.rarity],
        metadata: {
          actionLabel: "Crafted Item",
          sourceLabel: "Crafting System",
          resultLabel: `${output.name} x${output.quantity}`,
          recipeId: recipe.id,
          materialsConsumed: totalMaterialsConsumed,
          coinCost: totalCoinCost,
        },
      });

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "craft_materials_consumed",
        category: "crafting",
        description: `Consumed ${totalMaterialsConsumed} crafting materials for ${recipe.title}.`,
        quantity: totalMaterialsConsumed,
        origin: "crafting:craft",
        status: "consumed",
        tags: ["crafting", "materials"],
        metadata: {
          actionLabel: "Materials Consumed",
          sourceLabel: "Inventory",
          resultLabel: `${totalMaterialsConsumed} materials used`,
          ...Object.fromEntries(recipe.materials.map((material) => [material.itemId, material.quantity * quantity])),
        },
      });

      return {
        ok: true,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        quantity,
        xpGain,
        coinCost: totalCoinCost,
        level: progression.level,
        inventory: nextInventory,
      };
    });

    return Response.json(txResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete craft.";
    return Response.json({ error: message, recipes: CRAFT_RECIPES }, { status: statusFromErrorMessage(message) });
  }
}
