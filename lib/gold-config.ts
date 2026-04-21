import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { defaultGoldConfig, defaultGoldConfigEntry, type GoldConfig, type GoldConfigEntry } from "../app/data/gold-config";
import { db, firebaseEnabled } from "./firebase";

const goldConfigRef =
  db && firebaseEnabled ? doc(db, "app-config", "gold") : null;

type GoldConfigPayload = Partial<{
  default: Partial<Record<keyof GoldConfigEntry, unknown>>;
  overrides: Record<string, Partial<Record<keyof GoldConfigEntry, unknown>>>;
}>;

function normalizeGoldAmount(value: number): number {
  return Math.max(1000, Math.ceil(value / 1000) * 1000);
}

function sanitizeGoldConfigEntry(payload?: Partial<Record<keyof GoldConfigEntry, unknown>>): GoldConfigEntry {
  const minGold = typeof payload?.minGold === "number" && Number.isFinite(payload.minGold) && payload.minGold > 0
    ? normalizeGoldAmount(payload.minGold)
    : defaultGoldConfigEntry.minGold;
  const maxGold = typeof payload?.maxGold === "number" && Number.isFinite(payload.maxGold) && payload.maxGold >= minGold
    ? normalizeGoldAmount(payload.maxGold)
    : Math.max(defaultGoldConfigEntry.maxGold, minGold);

  return {
    pricePerThousand: typeof payload?.pricePerThousand === "number" && Number.isFinite(payload.pricePerThousand) && payload.pricePerThousand >= 1
      ? payload.pricePerThousand
      : defaultGoldConfigEntry.pricePerThousand,
    minGold,
    maxGold,
    goldStep: defaultGoldConfigEntry.goldStep,
  };
}

function sanitizeGoldConfig(payload?: GoldConfigPayload): GoldConfig {
  const defaultEntry = payload?.default ? sanitizeGoldConfigEntry(payload.default) : defaultGoldConfig.default;
  const overrides: Record<string, GoldConfigEntry> = {};
  if (payload?.overrides) {
    for (const [key, entryPayload] of Object.entries(payload.overrides)) {
      overrides[key] = sanitizeGoldConfigEntry(entryPayload);
    }
  }

  return {
    default: defaultEntry,
    overrides,
  };
}

export function subscribeToGoldConfig(
  onChange: (config: GoldConfig) => void
): Unsubscribe {
  if (!goldConfigRef) {
    onChange(defaultGoldConfig);
    return () => undefined;
  }

  return onSnapshot(
    goldConfigRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(defaultGoldConfig);
        return;
      }

      onChange(sanitizeGoldConfig(snapshot.data() as GoldConfigPayload));
    },
    () => {
      onChange(defaultGoldConfig);
    }
  );
}

export async function saveGoldConfig(config: GoldConfig) {
  if (!goldConfigRef) {
    throw new Error("Firebase nao configurado.");
  }

  const sanitizedConfig = sanitizeGoldConfig(config);

  await setDoc(
    goldConfigRef,
    {
      ...sanitizedConfig,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
