import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { defaultGoldConfig, type GoldConfig } from "../app/data/gold-config";
import { db, firebaseEnabled } from "./firebase";

const goldConfigRef =
  db && firebaseEnabled ? doc(db, "app-config", "gold") : null;

type GoldConfigPayload = Partial<Record<keyof GoldConfig, unknown>>;

function sanitizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function sanitizeSelectionMode(value: unknown): GoldConfig["selectionMode"] {
  return value === "game-server-faction"
    ? value
    : defaultGoldConfig.selectionMode;
}

function sanitizeGoldConfig(payload?: GoldConfigPayload): GoldConfig {
  const minGold = sanitizeNumber(payload?.minGold, defaultGoldConfig.minGold);
  const goldStep = sanitizeNumber(payload?.goldStep, defaultGoldConfig.goldStep);
  const rawMaxGold = sanitizeNumber(payload?.maxGold, defaultGoldConfig.maxGold);
  const normalizedMaxGold = Math.max(rawMaxGold, minGold);

  return {
    pricePerThousand: sanitizeNumber(
      payload?.pricePerThousand,
      defaultGoldConfig.pricePerThousand
    ),
    minGold,
    maxGold: normalizedMaxGold,
    goldStep,
    selectionMode: sanitizeSelectionMode(payload?.selectionMode),
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
