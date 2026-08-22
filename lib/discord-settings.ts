export const DISCORD_SETTINGS_DOC_ID = "discord-settings";

export type DiscordSettings = {
  autoSendEnabled: boolean;
  updatedAtMs: number;
};

export function buildDefaultDiscordSettings(): DiscordSettings {
  return {
    autoSendEnabled: true,
    updatedAtMs: Date.now(),
  };
}

export function sanitizeDiscordSettings(source: unknown): DiscordSettings {
  const fallback = buildDefaultDiscordSettings();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<DiscordSettings>;

  return {
    autoSendEnabled: typeof parsed.autoSendEnabled === "boolean" ? parsed.autoSendEnabled : fallback.autoSendEnabled,
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
