export type GoldConfigEntry = {
  pricePerThousand: number;
  minGold: number;
  maxGold: number;
  goldStep: number;
};

/** Key-to-configuration map. Key: "gameId", "gameId|serverId" or "gameId|serverId|faction". */
export type GoldConfig = Record<string, GoldConfigEntry>;

export const defaultGoldConfigEntry: GoldConfigEntry = {
  pricePerThousand: 20,
  minGold: 1000,
  maxGold: 10000,
  goldStep: 1000,
};

export const emptyGoldConfig: GoldConfig = {};

export function buildGoldKey(gameId: string, serverId?: string, faction?: string): string {
  const parts: string[] = [gameId];
  if (serverId) parts.push(serverId);
  if (faction) parts.push(faction);
  return parts.join("|");
}

export function getGoldConfigFor(
  goldConfig: GoldConfig,
  gameId: string,
  serverId?: string,
  faction?: string
): GoldConfigEntry {
  if (faction && serverId) {
    const key = buildGoldKey(gameId, serverId, faction);
    if (goldConfig[key]) return goldConfig[key];
  }
  if (serverId) {
    const key = buildGoldKey(gameId, serverId);
    if (goldConfig[key]) return goldConfig[key];
  }
  if (gameId) {
    if (goldConfig[gameId]) return goldConfig[gameId];
  }
  return defaultGoldConfigEntry;
}
