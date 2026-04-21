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

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return fallback;
}

function parseGoldConfigEntry(payload?: Partial<Record<keyof GoldConfigEntry, unknown>>): GoldConfigEntry {
  const pricePerThousand = toPositiveInt(payload?.pricePerThousand, defaultGoldConfigEntry.pricePerThousand);
  const minGold = toPositiveInt(payload?.minGold, defaultGoldConfigEntry.minGold);
  const maxGold = toPositiveInt(payload?.maxGold, defaultGoldConfigEntry.maxGold);

  return {
    pricePerThousand,
    minGold,
    maxGold: Math.max(maxGold, minGold),
    goldStep: defaultGoldConfigEntry.goldStep,
  };
}

function parseGoldConfig(payload?: GoldConfigPayload): GoldConfig {
  const defaultEntry = payload?.default
    ? parseGoldConfigEntry(payload.default)
    : defaultGoldConfig.default;

  const overrides: Record<string, GoldConfigEntry> = {};
  if (payload?.overrides) {
    for (const [key, entryPayload] of Object.entries(payload.overrides)) {
      overrides[key] = parseGoldConfigEntry(entryPayload);
    }
  }

  return { default: defaultEntry, overrides };
}

function serializeGoldConfig(config: GoldConfig): GoldConfigPayload & { updatedAt: string } {
  return {
    default: { ...config.default },
    overrides: Object.fromEntries(
      Object.entries(config.overrides).map(([key, entry]) => [key, { ...entry }])
    ),
    updatedAt: new Date().toISOString(),
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
      onChange(parseGoldConfig(snapshot.data() as GoldConfigPayload));
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

  await setDoc(goldConfigRef, serializeGoldConfig(config));
}
