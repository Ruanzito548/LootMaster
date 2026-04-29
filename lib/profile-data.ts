import { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db, firebaseEnabled } from "./firebase";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  rarity:
    | "poor"
    | "common"
    | "uncommon"
    | "rare"
    | "epic"
    | "legendary"
    | "artifact"
    | "heirloom";
  iconPath?: string;
};

export type ProfileTransaction = {
  id: string;
  title: string;
  type: "purchase" | "sale";
  status: "Completed" | "Pending";
  value: string;
  createdAtLabel: string;
};

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  coverURL: string;
  lootCoins: number;
  tickets: number;
  keys: number;
  inventory: InventoryItem[];
  transactions: ProfileTransaction[];
  inventorySlots: number;
  vipInventory: boolean;
};

const defaultInventory: InventoryItem[] = [
  {
    id: "inv-iron-sword",
    name: "Iron Sword",
    category: "Equipment",
    description: "Collectible item ready for transfer.",
    quantity: 1,
    rarity: "common",
    iconPath: "/itens/general/iron-sword.png",
  },
  {
    id: "inv-dragon-skin",
    name: "Dragon Skin",
    category: "Cosmetic",
    description: "Special appearance for your character.",
    quantity: 1,
    rarity: "rare",
    iconPath: "/itens/general/dragon-skin.png",
  },
  {
    id: "inv-uncommon-test",
    name: "Forest Totem",
    category: "General",
    description: "Uncommon test item for inventory hover and rarity color.",
    quantity: 1,
    rarity: "uncommon",
    iconPath: "/itens/general/uncommon-test.png",
  },
];

const defaultTransactions: ProfileTransaction[] = [
  {
    id: "tx-1",
    title: "Purchase of 5,000 gold",
    type: "purchase",
    status: "Completed",
    value: "R$ 179,00",
    createdAtLabel: "Today",
  },
  {
    id: "tx-2",
    title: "Retail account sale",
    type: "sale",
    status: "Pending",
    value: "R$ 420,00",
    createdAtLabel: "Yesterday",
  },
  {
    id: "tx-3",
    title: "M+ boost purchase",
    type: "purchase",
    status: "Completed",
    value: "R$ 89,00",
    createdAtLabel: "2 days ago",
  },
];

export const defaultCoverURL = "/wow/wow-classic-era/classic-era-wallpaper.avif";
export const defaultPhotoURL = "/lootmasterlogo.png";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function isTransaction(value: unknown): value is ProfileTransaction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const parsed = value as Partial<ProfileTransaction>;

  return (
    typeof parsed.id === "string" &&
    typeof parsed.title === "string" &&
    (parsed.type === "purchase" || parsed.type === "sale") &&
    (parsed.status === "Completed" || parsed.status === "Pending") &&
    typeof parsed.value === "string" &&
    typeof parsed.createdAtLabel === "string"
  );
}

function createDefaultProfile(user: Pick<User, "uid" | "displayName" | "email" | "photoURL">): UserProfile {
  return {
    uid: user.uid,
    username: user.displayName?.trim() || "Adventurer",
    email: user.email?.trim().toLowerCase() || "",
    photoURL: user.photoURL || defaultPhotoURL,
    coverURL: defaultCoverURL,
    lootCoins: 1250,
    tickets: 12,
    keys: 4,
    inventory: defaultInventory,
    transactions: defaultTransactions,
    inventorySlots: 9,
    vipInventory: false,
  };
}

function mapUserProfile(uid: string, source: Record<string, unknown>): UserProfile {
  const fallback = createDefaultProfile({ uid, displayName: null, email: null, photoURL: null });

  const inventoryRaw = Array.isArray(source.inventory) ? source.inventory : [];
  const transactionsRaw = Array.isArray(source.transactions) ? source.transactions : [];

  const inventory = inventoryRaw.filter(isInventoryItem);
  const transactions = transactionsRaw.filter(isTransaction);

  return {
    uid,
    username: getString(source.username, fallback.username),
    email: getString(source.email, fallback.email),
    photoURL: getString(source.photoURL, fallback.photoURL),
    coverURL: getString(source.coverURL, fallback.coverURL),
    lootCoins: getNumber(source.lootCoins, fallback.lootCoins),
    tickets: getNumber(source.tickets, fallback.tickets),
    keys: getNumber(source.keys, fallback.keys),
    inventory: inventory.length > 0 ? inventory : fallback.inventory,
    transactions: transactions.length > 0 ? transactions : fallback.transactions,
    inventorySlots: getNumber(source.inventorySlots, fallback.inventorySlots),
    vipInventory: source.vipInventory === true,
  };
}

type EnsureProfileInput = {
  username?: string;
  email?: string;
  assignedAgentId?: string | null;
};

export async function ensureUserProfileDoc(user: User, input?: EnsureProfileInput): Promise<UserProfile | null> {
  if (!firebaseEnabled || !db) {
    return null;
  }

  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const existingRaw = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;

  const baseProfile = existingRaw
    ? mapUserProfile(user.uid, existingRaw)
    : createDefaultProfile(user);

  const mergedProfile: UserProfile = {
    ...baseProfile,
    username: input?.username?.trim() || baseProfile.username,
    email: input?.email?.trim().toLowerCase() || baseProfile.email,
    photoURL: user.photoURL || baseProfile.photoURL,
  };

  await setDoc(
    ref,
    {
      ...mergedProfile,
      uid: user.uid,
      authProvider: "google",
      assignedAgentId: input?.assignedAgentId ?? existingRaw?.assignedAgentId ?? null,
      updatedAt: serverTimestamp(),
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );

  return mergedProfile;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!firebaseEnabled || !db) {
    return null;
  }

  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapUserProfile(uid, snapshot.data() as Record<string, unknown>);
}
