import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";

import { db, firebaseEnabled } from "./firebase";
import { type InventoryItem } from "./profile-data";

const TARGET_TICKET_EMAIL = "ruanzito548@gmail.com";

function createRuanzitoTicketPack(): InventoryItem[] {
  return [
    {
      id: "ruanzito-ticket-common",
      name: "Traveler Ticket",
      category: "Ticket",
      description: "Basic ticket used for common reward entries.",
      quantity: 1,
      rarity: "common",
      iconPath: "/itens/general/ticket.png",
    },
    {
      id: "ruanzito-ticket-rare",
      name: "Hero Ticket",
      category: "Ticket",
      description: "Rare ticket with enhanced rewards.",
      quantity: 1,
      rarity: "rare",
      iconPath: "/itens/general/ticket.png",
    },
    {
      id: "ruanzito-ticket-epic",
      name: "Champion Ticket",
      category: "Ticket",
      description: "Epic ticket used for high-value reward entries.",
      quantity: 1,
      rarity: "epic",
      iconPath: "/itens/general/ticket.png",
    },
  ];
}

export async function grantRuanzitoTicketPack(): Promise<void> {
  if (!db || !firebaseEnabled) {
    throw new Error("Firebase not configured.");
  }

  const usersCol = collection(db, "users");
  const userQuery = query(usersCol, where("email", "==", TARGET_TICKET_EMAIL));
  const userSnapshot = await getDocs(userQuery);

  if (userSnapshot.empty) {
    throw new Error(`User profile not found for ${TARGET_TICKET_EMAIL}.`);
  }

  const userDoc = userSnapshot.docs[0];
  const rawInventory = Array.isArray(userDoc.data().inventory) ? (userDoc.data().inventory as InventoryItem[]) : [];

  const nextInventory = [
    ...rawInventory.filter((item) => !item.id.startsWith("ruanzito-ticket-")),
    ...createRuanzitoTicketPack(),
  ];

  await setDoc(
    doc(db, "users", userDoc.id),
    {
      inventory: nextInventory,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
