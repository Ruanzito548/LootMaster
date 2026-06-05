export type GameThemeKey =
  | "default"
  | "classic-era"
  | "tbc-anniversary"
  | "wrath"
  | "mist-of-pandaria"
  | "diablo"
  | "runescape"
  | "gta";

const pathThemeMatchers: Array<{ key: GameThemeKey; matchers: string[] }> = [
  { key: "classic-era", matchers: ["classic-era", "classic"] },
  { key: "tbc-anniversary", matchers: ["tbc-anniversary", "burning-crusade", "tbc"] },
  { key: "wrath", matchers: ["wrath", "retail", "lich-king"] },
  { key: "mist-of-pandaria", matchers: ["mist-of-pandaria", "mists-of-pandaria", "pandaria"] },
  { key: "diablo", matchers: ["diablo"] },
  { key: "runescape", matchers: ["runescape", "rs3", "osrs"] },
  { key: "gta", matchers: ["gta", "grand-theft-auto"] },
];

export const GAME_THEME_STORAGE_KEY = "lootmaster:selected-theme";

export function resolveThemeFromPath(pathname: string): GameThemeKey | null {
  const normalizedPathname = pathname.toLowerCase();

  for (const entry of pathThemeMatchers) {
    if (entry.matchers.some((matcher) => normalizedPathname.includes(matcher))) {
      return entry.key;
    }
  }

  return null;
}

export function isGameThemeKey(value: string): value is GameThemeKey {
  return ["default", "classic-era", "tbc-anniversary", "wrath", "mist-of-pandaria", "diablo", "runescape", "gta"].includes(value);
}
