export const goldSelectionModes = [
  {
    id: "game-server-faction",
    label: "Jogo -> Servidor -> Faccao",
    description: "O jogador escolhe o jogo primeiro, depois o servidor e por fim a faccao.",
  },
] as const;

export type GoldSelectionMode = (typeof goldSelectionModes)[number]["id"];

export type GoldConfig = {
  pricePerThousand: number;
  minGold: number;
  maxGold: number;
  goldStep: number;
  selectionMode: GoldSelectionMode;
};

export const defaultGoldConfig: GoldConfig = {
  pricePerThousand: 20,
  minGold: 1000,
  maxGold: 10000,
  goldStep: 1000,
  selectionMode: "game-server-faction",
};
