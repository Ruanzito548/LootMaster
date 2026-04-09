export const goldSelectionModes = [
  {
    id: "game-server-faction",
    label: "Jogo -> Servidor -> Faccao",
    description: "O jogador escolhe o jogo primeiro, depois o servidor e por fim a faccao.",
  },
] as const;

export type GoldSelectionMode = (typeof goldSelectionModes)[number]["id"];

export type GoldConfigEntry = {
  pricePerThousand: number;
  minGold: number;
  maxGold: number;
  goldStep: number;
};

export type GoldConfig = {
  default: GoldConfigEntry;
  overrides: Record<string, GoldConfigEntry>;
};

export const defaultGoldConfigEntry: GoldConfigEntry = {
  pricePerThousand: 20,
  minGold: 1000,
  maxGold: 10000,
  goldStep: 1000,
};

export const defaultGoldConfig: GoldConfig = {
  default: defaultGoldConfigEntry,
  overrides: {},
};

export function getGoldConfigFor(
  goldConfig: GoldConfig,
  gameId: string,
  serverId?: string,
  faction?: string
): GoldConfigEntry {
  const keys: string[] = [];
  if (gameId) keys.push(gameId);
  if (serverId) keys.push(`${gameId}|${serverId}`);
  if (faction) keys.push(`${gameId}|${serverId}|${faction}`);

  for (const key of keys.reverse()) {
    if (goldConfig.overrides[key]) {
      return goldConfig.overrides[key];
    }
  }
  return goldConfig.default;
}
