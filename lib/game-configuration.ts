export const GAME_CONFIGURATION_SCHEMA_VERSION = 1;
export const GAME_CONFIGURATION_COLLECTION = "settings";
export const GAME_CONFIGURATION_DOC_ID = "gameConfiguration";

export const CONFIGURABLE_GAME_IDS = [
  "retail",
  "classic-era",
  "tbc-anniversary",
  "mist-of-pandaria",
] as const;

export const CONFIGURABLE_CATEGORY_IDS = ["gold", "boost", "accounts"] as const;

export type ConfigurableGameId = (typeof CONFIGURABLE_GAME_IDS)[number];
export type ConfigurableCategoryId = (typeof CONFIGURABLE_CATEGORY_IDS)[number];

export type GameCategoryToggles = {
  enabled: boolean;
  gold: boolean;
  boost: boolean;
  accounts: boolean;
};

export type GameConfiguration = {
  schemaVersion: number;
  updatedAtMs: number;
  byGame: Record<string, GameCategoryToggles>;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function sanitizeToggle(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function sanitizeGameEntry(value: unknown, fallback: GameCategoryToggles): GameCategoryToggles {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const parsed = value as Partial<GameCategoryToggles>;

  return {
    enabled: sanitizeToggle(parsed.enabled, fallback.enabled),
    gold: sanitizeToggle(parsed.gold, fallback.gold),
    boost: sanitizeToggle(parsed.boost, fallback.boost),
    accounts: sanitizeToggle(parsed.accounts, fallback.accounts),
  };
}

function buildDefaultGameToggle(enabled = true): GameCategoryToggles {
  return {
    enabled,
    gold: enabled,
    boost: enabled,
    accounts: enabled,
  };
}

export function buildDefaultGameConfiguration(): GameConfiguration {
  return {
    schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
    updatedAtMs: Date.now(),
    byGame: Object.fromEntries(CONFIGURABLE_GAME_IDS.map((gameId) => [gameId, buildDefaultGameToggle(true)])),
  };
}

export function sanitizeGameConfiguration(source: unknown): GameConfiguration {
  const fallback = buildDefaultGameConfiguration();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<GameConfiguration>;
  const sourceByGame = parsed.byGame && typeof parsed.byGame === "object" ? parsed.byGame : {};

  const byGame = Object.fromEntries(
    CONFIGURABLE_GAME_IDS.map((gameId) => {
      const fallbackEntry = fallback.byGame[gameId];
      const rawEntry = (sourceByGame as Record<string, unknown>)[gameId];
      return [gameId, sanitizeGameEntry(rawEntry, fallbackEntry)];
    }),
  );

  return {
    schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
    updatedAtMs: asFiniteNumber(parsed.updatedAtMs) ?? Date.now(),
    byGame,
  };
}

export function canAccessGame(config: GameConfiguration, gameId: string, isAdmin: boolean): boolean {
  const gameConfig = config.byGame[gameId];

  if (!gameConfig) {
    return isAdmin;
  }

  return isAdmin || gameConfig.enabled;
}

export function canAccessCategory(
  config: GameConfiguration,
  gameId: string,
  categoryId: string,
  isAdmin: boolean,
): boolean {
  if (!canAccessGame(config, gameId, isAdmin)) {
    return false;
  }

  const gameConfig = config.byGame[gameId];
  if (!gameConfig) {
    return isAdmin;
  }

  if (categoryId !== "gold" && categoryId !== "boost" && categoryId !== "accounts") {
    return false;
  }

  return isAdmin || gameConfig[categoryId];
}
