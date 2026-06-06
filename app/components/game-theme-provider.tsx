"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import { GAME_THEME_STORAGE_KEY, type GameThemeKey } from "../../lib/game-theme";

type GameThemeContextValue = {
  theme: GameThemeKey;
  setTheme: (theme: GameThemeKey) => void;
};

const GameThemeContext = createContext<GameThemeContextValue | null>(null);

type GameThemeProviderProps = {
  children: React.ReactNode;
};

const GLOBAL_THEME: GameThemeKey = "tbc-anniversary";

function applyThemeToDom(theme: GameThemeKey) {
  document.documentElement.dataset.gameTheme = theme;
}

export function GameThemeProvider({ children }: GameThemeProviderProps) {
  const theme = GLOBAL_THEME;

  useEffect(() => {
    applyThemeToDom(theme);
    window.localStorage.setItem(GAME_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (_nextTheme: GameThemeKey) => {
        // Global theme is fixed to TBC for the whole site.
      },
    }),
    [theme],
  );

  return <GameThemeContext.Provider value={value}>{children}</GameThemeContext.Provider>;
}

export function useGameTheme() {
  const context = useContext(GameThemeContext);

  if (!context) {
    throw new Error("useGameTheme must be used inside GameThemeProvider");
  }

  return context;
}
