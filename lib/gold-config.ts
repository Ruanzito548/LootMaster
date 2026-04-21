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
import { db, firebaseEnabled } from "./firebase";

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
 * Escuta toda a coleção gold-config.
 * Cada documento tem ID igual à chave de escopo:
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

/** Salva (ou sobrescreve) a configuração de um escopo específico. */
export async function saveGoldConfigEntry(key: string, entry: GoldConfigEntry): Promise<void> {
  if (!goldConfigCol) {
    throw new Error("Firebase nao configurado.");
  }
  await setDoc(doc(goldConfigCol, key), {
    pricePerThousand: entry.pricePerThousand,
    minGold: entry.minGold,
    maxGold: entry.maxGold,
    goldStep: entry.goldStep,
    updatedAt: new Date().toISOString(),
  });
}

/** Remove a configuração de um escopo específico (volta ao fallback). */
export async function deleteGoldConfigEntry(key: string): Promise<void> {
  if (!goldConfigCol) {
    throw new Error("Firebase nao configurado.");
  }
  await deleteDoc(doc(goldConfigCol, key));
}

