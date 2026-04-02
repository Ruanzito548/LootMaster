export type Game = {
  id: string;
  title: string;
  shortTitle: string;
  tag: string;
  description: string;
};

export const HOT_GAMES_STORAGE_KEY = "loot-master-hot-games";

export const games: Game[] = [
  {
    id: "retail",
    title: "World of Warcraft Retail",
    shortTitle: "Retail",
    tag: "Live",
    description:
      "Versao principal para jogadores que querem compra rapida, entrega recorrente e maior volume de gold.",
  },
  {
    id: "classic-era",
    title: "World of Warcraft Classic Era",
    shortTitle: "Classic Era",
    tag: "Classic",
    description:
      "Fluxo dedicado para realms permanentes, com identidade mais old school e foco em estabilidade.",
  },
  {
    id: "tbc-anniversary",
    title: "World of Warcraft TBC Anniversary",
    shortTitle: "TBC Anniversary",
    tag: "Progression",
    description:
      "Camada separada para jogadores da experiencia Burning Crusade com selecao posterior de servidor.",
  },
  {
    id: "mist-of-pandaria",
    title: "World of Warcraft Mist of Pandaria",
    shortTitle: "Mist of Pandaria",
    tag: "Pandaria",
    description:
      "Entrada pronta para a fase Pandaria, mantendo a navegacao consistente para o restante do funil.",
  },
];

export const defaultHotGameIds = ["retail", "mist-of-pandaria"];
