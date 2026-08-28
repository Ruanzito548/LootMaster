export const DISCORD_SETTINGS_DOC_ID = "discord-settings";

/** Games that can have a dedicated Discord channel configured for order notifications. */
export const DISCORD_CHANNEL_GAME_IDS = [
  "tbc-anniversary",
  "retail",
  "classic-era",
  "mist-of-pandaria",
] as const;

export type DiscordChannelGameId = (typeof DISCORD_CHANNEL_GAME_IDS)[number];

export type DiscordSettings = {
  autoSendEnabled: boolean;
  channelsByGame: Record<string, string>;
  paymentMethods: Record<"pix" | "card" | "paypal" | "balance", boolean>;
  updatedAtMs: number;
};

export function buildDefaultDiscordSettings(): DiscordSettings {
  return {
    autoSendEnabled: true,
    channelsByGame: {},
    paymentMethods: { pix: true, card: true, paypal: true, balance: true },
    updatedAtMs: Date.now(),
  };
}

function sanitizeChannelsByGame(source: unknown): Record<string, string> {
  if (!source || typeof source !== "object") {
    return {};
  }

  const parsed = source as Record<string, unknown>;
  const result: Record<string, string> = {};

  for (const gameId of DISCORD_CHANNEL_GAME_IDS) {
    const value = parsed[gameId];
    if (typeof value === "string" && value.trim()) {
      result[gameId] = value.trim();
    }
  }

  return result;
}

export function sanitizeDiscordSettings(source: unknown): DiscordSettings {
  const fallback = buildDefaultDiscordSettings();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<DiscordSettings>;

  return {
    autoSendEnabled: typeof parsed.autoSendEnabled === "boolean" ? parsed.autoSendEnabled : fallback.autoSendEnabled,
    channelsByGame: sanitizeChannelsByGame(parsed.channelsByGame),
    paymentMethods: {
      pix: typeof parsed.paymentMethods?.pix === "boolean" ? parsed.paymentMethods.pix : fallback.paymentMethods.pix,
      card: typeof parsed.paymentMethods?.card === "boolean" ? parsed.paymentMethods.card : fallback.paymentMethods.card,
      paypal: typeof parsed.paymentMethods?.paypal === "boolean" ? parsed.paymentMethods.paypal : fallback.paymentMethods.paypal,
      balance: typeof parsed.paymentMethods?.balance === "boolean" ? parsed.paymentMethods.balance : fallback.paymentMethods.balance,
    },
    updatedAtMs:
      typeof parsed.updatedAtMs === "number" && Number.isFinite(parsed.updatedAtMs) ? parsed.updatedAtMs : fallback.updatedAtMs,
  };
}

/**
 * Reads the Discord auto-send toggle directly from Firestore Admin SDK.
 * Defaults to enabled (current legacy behavior) when unset or on error.
 */
export async function isDiscordAutoSendEnabled(): Promise<boolean> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const snapshot = await getAdminDb().collection("app-config").doc(DISCORD_SETTINGS_DOC_ID).get();
    if (!snapshot.exists) {
      return true;
    }

    return sanitizeDiscordSettings(snapshot.data()).autoSendEnabled;
  } catch (error) {
    console.warn("[Discord Settings] Could not read auto-send setting, defaulting to enabled:", error);
    return true;
  }
}

/**
 * Reads the admin-configured per-game Discord channel overrides.
 * Returns an empty map on error so callers fall back to env-based resolution.
 */
export async function getDiscordChannelOverrides(): Promise<Record<string, string>> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const snapshot = await getAdminDb().collection("app-config").doc(DISCORD_SETTINGS_DOC_ID).get();
    if (!snapshot.exists) {
      return {};
    }

    return sanitizeDiscordSettings(snapshot.data()).channelsByGame;
  } catch (error) {
    console.warn("[Discord Settings] Could not read channel overrides:", error);
    return {};
  }
}
