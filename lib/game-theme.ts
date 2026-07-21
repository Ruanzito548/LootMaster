export type GameThemeKey = "tbc-anniversary";

export const GAME_THEME_STORAGE_KEY = "lootmaster:selected-theme";

export function resolveThemeFromPath(): GameThemeKey | null {
  return "tbc-anniversary";
}

export function isGameThemeKey(value: string): value is GameThemeKey {
  return value === "tbc-anniversary";
}
