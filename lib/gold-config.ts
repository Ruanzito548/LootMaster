import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import {
  defaultGoldConfigEntry,
  emptyGoldConfig,
  type GoldConfig,
  type GoldConfigEntry,
} from "../app/data/gold-config";
import { auth, db, firebaseEnabled } from "./firebase";

const goldConfigCol =
  db && firebaseEnabled ? collection(db, "gold-config") : null;

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return fallback;
}

function parseEntry(data: Record<string, unknown>): GoldConfigEntry {
  const minGold = toPositiveInt(data.minGold, defaultGoldConfigEntry.minGold);
  const maxGold = toPositiveInt(data.maxGold, defaultGoldConfigEntry.maxGold);
  return {
    pricePerThousand: toPositiveInt(data.pricePerThousand, defaultGoldConfigEntry.pricePerThousand),
    minGold,
    maxGold: Math.max(maxGold, minGold),
    goldStep: toPositiveInt(data.goldStep, defaultGoldConfigEntry.goldStep),
  };
}

/**
 * Listens to the full gold-config collection.
 * Each document ID matches a scope key:
 *   "tbc-anniversary"
 *   "tbc-anniversary|nightslayer-us"
 *   "tbc-anniversary|nightslayer-us|Horde"
 */
export function subscribeToGoldConfig(
  onChange: (config: GoldConfig) => void
): Unsubscribe {
  if (!goldConfigCol) {
    onChange(emptyGoldConfig);
    return () => undefined;
  }

  return onSnapshot(
    goldConfigCol,
    (snapshot) => {
      const config: GoldConfig = {};
      for (const docSnap of snapshot.docs) {
        config[docSnap.id] = parseEntry(docSnap.data() as Record<string, unknown>);
      }
      onChange(config);
    },
    () => {
      onChange(emptyGoldConfig);
    }
  );
}

/** Saves (or overwrites) the configuration for a specific scope. */
export async function saveGoldConfigEntry(key: string, entry: GoldConfigEntry): Promise<void> {
  if (!goldConfigCol) {
    throw new Error("Firebase not configured.");
  }

  if (!auth?.currentUser) {
    throw new Error("You must be logged in to save gold settings.");
  }

  await auth.currentUser.getIdToken();

  await setDoc(doc(goldConfigCol, key), {
    pricePerThousand: entry.pricePerThousand,
    minGold: entry.minGold,
    maxGold: entry.maxGold,
    goldStep: entry.goldStep,
    updatedAt: new Date().toISOString(),
  });
}

/** Removes the configuration for a specific scope (falls back to inherited values). */
export async function deleteGoldConfigEntry(key: string): Promise<void> {
  if (!goldConfigCol) {
    throw new Error("Firebase not configured.");
  }

  if (!auth?.currentUser) {
    throw new Error("You must be logged in to remove gold settings.");
  }

  await auth.currentUser.getIdToken();

  await deleteDoc(doc(goldConfigCol, key));
}

