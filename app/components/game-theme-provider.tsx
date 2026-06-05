"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { GAME_THEME_STORAGE_KEY, resolveThemeFromPath, type GameThemeKey } from "../../lib/game-theme";

type GameThemeContextValue = {
  theme: GameThemeKey;
  setTheme: (theme: GameThemeKey) => void;
};

const GameThemeContext = createContext<GameThemeContextValue | null>(null);

type GameThemeProviderProps = {
  children: React.ReactNode;
};

function applyThemeToDom(theme: GameThemeKey) {
  document.documentElement.dataset.gameTheme = theme;
}

export function GameThemeProvider({ children }: GameThemeProviderProps) {
  const pathname = usePathname();
  const [manualTheme, setManualTheme] = useState<GameThemeKey | null>(null);

  const inferredTheme = resolveThemeFromPath(pathname ?? "");

  const theme = manualTheme ?? inferredTheme ?? "default";

  useEffect(() => {
    applyThemeToDom(theme);
    window.localStorage.setItem(GAME_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (nextTheme: GameThemeKey) => {
    setManualTheme(nextTheme);
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <GameThemeContext.Provider value={value}>{children}</GameThemeContext.Provider>;
}

export function useGameTheme() {
  const context = useContext(GameThemeContext);

  if (!context) {
    throw new Error("useGameTheme must be used inside GameThemeProvider");
  }

  return context;
}
