import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, type Unsubscribe } from "firebase/firestore";

import { db, firebaseEnabled } from "./firebase";

export const wowRarities = [
  "poor",
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "artifact",
  "heirloom",
] as const;

export type WowRarity = (typeof wowRarities)[number];

export type InventoryCatalogItem = {
  id: string;
  name: string;
  rarity: WowRarity;
  iconPath: string;
  gameId: string;
};

type InventoryCatalogInput = Omit<InventoryCatalogItem, "id">;

const inventoryItemsCol = db && firebaseEnabled ? collection(db, "inventory-items") : null;

function asRarity(value: unknown): WowRarity {
  return wowRarities.includes(value as WowRarity) ? (value as WowRarity) : "common";
}

function parseInventoryCatalogItem(id: string, data: Record<string, unknown>): InventoryCatalogItem {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Unknown item",
    rarity: asRarity(data.rarity),
    iconPath: typeof data.iconPath === "string" ? data.iconPath : "/itens/general/unknown.png",
    gameId: typeof data.gameId === "string" ? data.gameId : "general",
  };
}

export function subscribeToInventoryItems(
  onChange: (items: InventoryCatalogItem[]) => void,
): Unsubscribe {
  if (!inventoryItemsCol) {
    onChange([]);
    return () => undefined;
  }

  const q = query(inventoryItemsCol);

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        parseInventoryCatalogItem(docSnap.id, docSnap.data() as Record<string, unknown>),
      );

      onChange(items);
    },
    () => onChange([]),
  );
}

export async function createInventoryItem(input: InventoryCatalogInput): Promise<string> {
  if (!inventoryItemsCol) {
    throw new Error("Firebase not configured.");
  }

  const ref = await addDoc(inventoryItemsCol, {
    ...input,
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

export async function resetInventoryItemsToDefaultTickets(): Promise<void> {
  if (!inventoryItemsCol) {
    throw new Error("Firebase not configured.");
  }

  const snapshot = await getDocs(query(inventoryItemsCol));
  await Promise.all(snapshot.docs.map((row) => deleteDoc(doc(inventoryItemsCol, row.id))));

  const defaults: InventoryCatalogInput[] = [
    {
      name: "Traveler Ticket",
      rarity: "common",
      iconPath: "/itens/general/ticket.png",
      gameId: "general",
    },
    {
      name: "Explorer Ticket",
      rarity: "uncommon",
      iconPath: "/itens/general/ticket.png",
      gameId: "general",
    },
    {
      name: "Champion Ticket",
      rarity: "epic",
      iconPath: "/itens/general/ticket.png",
      gameId: "general",
    },
  ];

  await Promise.all(defaults.map((item) => addDoc(inventoryItemsCol, { ...item, createdAt: new Date().toISOString() })));
}
