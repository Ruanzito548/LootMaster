import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import {
  accountClassOptions,
  accountGenderOptions,
  accountRaceOptions,
  type AccountClass,
  type AccountGender,
  type AccountListing,
  type AccountRace,
} from "../app/data/accounts";
import { db, firebaseEnabled } from "./firebase";

const accountsCol =
  db && firebaseEnabled ? collection(db, "accounts-market") : null;

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return fallback;
}

function asRace(value: unknown): AccountRace {
  return accountRaceOptions.includes(value as AccountRace)
    ? (value as AccountRace)
    : "Human";
}

function asClass(value: unknown): AccountClass {
  return accountClassOptions.includes(value as AccountClass)
    ? (value as AccountClass)
    : "Warrior";
}

function asGender(value: unknown): AccountGender {
  return accountGenderOptions.includes(value as AccountGender)
    ? (value as AccountGender)
    : "Male";
}

function parseListing(id: string, data: Record<string, unknown>): AccountListing {
  return {
    id,
    gameId: typeof data.gameId === "string" ? data.gameId : "",
    title: typeof data.title === "string" ? data.title : "Untitled account",
    serverId: typeof data.serverId === "string" ? data.serverId : "",
    serverName: typeof data.serverName === "string" ? data.serverName : "Unknown server",
    faction: data.faction === "Alliance" ? "Alliance" : "Horde",
    gender: asGender(data.gender),
    race: asRace(data.race),
    className: asClass(data.className),
    level: asPositiveInt(data.level, 70),
    price: asPositiveInt(data.price, 1),
    professionOne:
      typeof data.professionOne === "string" && data.professionOne.trim() !== ""
        ? data.professionOne
        : "-",
    professionTwo:
      typeof data.professionTwo === "string" && data.professionTwo.trim() !== ""
        ? data.professionTwo
        : "-",
    highlights: Array.isArray(data.highlights)
      ? data.highlights.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export type NewAccountInput = Omit<AccountListing, "id">;

export function subscribeToAccountsMarket(
  gameId: string,
  onChange: (listings: AccountListing[]) => void
): Unsubscribe {
  if (!accountsCol) {
    onChange([]);
    return () => undefined;
  }

  const q = query(accountsCol, where("gameId", "==", gameId));
  return onSnapshot(
    q,
    (snapshot) => {
      const listings = snapshot.docs.map((snap) =>
        parseListing(snap.id, snap.data() as Record<string, unknown>)
      );
      onChange(listings);
    },
    () => onChange([])
  );
}

export async function addAccountToMarket(input: NewAccountInput): Promise<string> {
  if (!accountsCol) {
    throw new Error("Firebase nao configurado.");
  }

  const ref = await addDoc(accountsCol, {
    ...input,
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

export async function clearAccountsMarket(gameId: string): Promise<void> {
  if (!accountsCol) {
    throw new Error("Firebase nao configurado.");
  }

  const q = query(accountsCol, where("gameId", "==", gameId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((row) => deleteDoc(doc(accountsCol, row.id))));
}

export async function deleteAccountFromMarket(accountId: string): Promise<void> {
  if (!accountsCol) {
    throw new Error("Firebase nao configurado.");
  }

  await deleteDoc(doc(accountsCol, accountId));
}
