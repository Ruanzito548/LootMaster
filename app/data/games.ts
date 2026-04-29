export type Game = {
  id: string;
  title: string;
  shortTitle: string;
  tag: string;
  description: string;
};

export type ServiceCategory = {
  id: "gold" | "boost" | "accounts";
  title: string;
  description: string;
  accent: string;
};

export type GameServer = {
  id: string;
  name: string;
  region: string;
  factions: string[];
  type: string;
  total: number;
  sideA: {
    amount: number;
    percent: number;
  };
  sideB: {
    amount: number;
    percent: number;
  };
};

export const games: Game[] = [
  {
    id: "retail",
    title: "World of Warcraft Midnight",
    shortTitle: "Midnight",
    tag: "Live",
    description:
      "Main version for players who want fast purchases, recurring delivery, and higher gold volume.",
  },
  {
    id: "classic-era",
    title: "World of Warcraft Classic Era",
    shortTitle: "Classic Era",
    tag: "Classic",
    description:
      "Dedicated flow for permanent realms, with a more old-school identity and focus on stability.",
  },
  {
    id: "tbc-anniversary",
    title: "World of Warcraft TBC Anniversary",
    shortTitle: "TBC Anniversary",
    tag: "Progression",
    description:
      "Separate layer for Burning Crusade players with later server selection.",
  },
  {
    id: "mist-of-pandaria",
    title: "World of Warcraft Mist of Pandaria",
    shortTitle: "Mist of Pandaria",
    tag: "Pandaria",
    description:
      "Entry prepared for the Pandaria phase, keeping navigation consistent for the rest of the funnel.",
  },
];

export const defaultHotGameIds = ["retail", "mist-of-pandaria"];

export const serviceCategories: ServiceCategory[] = [
  {
    id: "gold",
    title: "Gold",
    description: "Fast delivery offers for in-game currency.",
    accent: "bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] text-[#2f1405]",
  },
  {
    id: "boost",
    title: "Boost",
    description: "Progression services, carries and character help.",
    accent: "border border-[#84d5ff]/20 bg-[#0d3f7a]/40 text-[#d8f4ff]",
  },
  {
    id: "accounts",
    title: "Accounts",
    description: "Account listings and ready-to-play options.",
    accent: "border border-[#ffd76a]/18 bg-[#fff1be]/10 text-[#ffc94d]",
  },
];

export const tbcAnniversaryServers: GameServer[] = [
  {
    id: "spineshatter-eu",
    name: "Spineshatter EU",
    region: "EU",
    factions: ["Horde", "Alliance"],
    type: "PvP",
    total: 102826,
    sideA: {
      amount: 46084,
      percent: 44.8,
    },
    sideB: {
      amount: 56742,
      percent: 55.2,
    },
  },
  {
    id: "nightslayer-us",
    name: "Nightslayer US",
    region: "US",
    factions: ["Horde", "Alliance"],
    type: "PvP",
    total: 78944,
    sideA: {
      amount: 36818,
      percent: 46.6,
    },
    sideB: {
      amount: 42126,
      percent: 53.4,
    },
  },
  {
    id: "thunderstrike-eu",
    name: "Thunderstrike EU",
    region: "EU",
    factions: ["Horde", "Alliance"],
    type: "PvE",
    total: 66850,
    sideA: {
      amount: 37379,
      percent: 55.9,
    },
    sideB: {
      amount: 29471,
      percent: 44.1,
    },
  },
  {
    id: "dreamscythe-us",
    name: "Dreamscythe US",
    region: "US",
    factions: ["Horde", "Alliance"],
    type: "PvE",
    total: 59775,
    sideA: {
      amount: 32702,
      percent: 54.7,
    },
    sideB: {
      amount: 27073,
      percent: 45.3,
    },
  },
];

export function getGameById(id: string) {
  return games.find((game) => game.id === id);
}

export function getServiceCategoryById(id: string) {
  return serviceCategories.find((category) => category.id === id);
}

export function getServersByGameId(gameId: string) {
  if (gameId === "tbc-anniversary") {
    return tbcAnniversaryServers;
  }

  return [];
}
