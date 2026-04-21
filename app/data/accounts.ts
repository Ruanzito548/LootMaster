export type AccountClass =
  | "Warrior"
  | "Paladin"
  | "Hunter"
  | "Rogue"
  | "Priest"
  | "Shaman"
  | "Mage"
  | "Warlock"
  | "Druid";

export type AccountRace =
  | "Human"
  | "Orc"
  | "Undead"
  | "Troll"
  | "Tauren"
  | "Night Elf"
  | "Dwarf"
  | "Gnome"
  | "Blood Elf"
  | "Draenei";

export type AccountListing = {
  id: string;
  gameId: string;
  title: string;
  serverId: string;
  serverName: string;
  faction: "Horde" | "Alliance";
  race: AccountRace;
  className: AccountClass;
  level: number;
  price: number;
  highlights: string[];
};

const accountListings: AccountListing[] = [
  {
    id: "tbc-acc-001",
    gameId: "tbc-anniversary",
    title: "Warlock PvP Ready",
    serverId: "nightslayer-us",
    serverName: "Nightslayer US",
    faction: "Horde",
    race: "Undead",
    className: "Warlock",
    level: 70,
    price: 139,
    highlights: ["Epic flying", "Tailoring", "Arena set"],
  },
  {
    id: "tbc-acc-002",
    gameId: "tbc-anniversary",
    title: "Paladin Gold Farmer",
    serverId: "spineshatter-eu",
    serverName: "Spineshatter EU",
    faction: "Alliance",
    race: "Human",
    className: "Paladin",
    level: 70,
    price: 119,
    highlights: ["Mining 375", "Herbalism 375", "Fast mount"],
  },
  {
    id: "tbc-acc-003",
    gameId: "tbc-anniversary",
    title: "Rogue PvE Starter",
    serverId: "dreamscythe-us",
    serverName: "Dreamscythe US",
    faction: "Horde",
    race: "Orc",
    className: "Rogue",
    level: 70,
    price: 89,
    highlights: ["Pre-raid gear", "Alchemy", "Stealth spec"],
  },
  {
    id: "tbc-acc-004",
    gameId: "tbc-anniversary",
    title: "Mage Boosting Setup",
    serverId: "thunderstrike-eu",
    serverName: "Thunderstrike EU",
    faction: "Alliance",
    race: "Gnome",
    className: "Mage",
    level: 70,
    price: 159,
    highlights: ["AoE spec", "Ench 350+", "Dungeon keys"],
  },
  {
    id: "tbc-acc-005",
    gameId: "tbc-anniversary",
    title: "Hunter Raid Ready",
    serverId: "spineshatter-eu",
    serverName: "Spineshatter EU",
    faction: "Horde",
    race: "Blood Elf",
    className: "Hunter",
    level: 70,
    price: 179,
    highlights: ["Raid consumables", "Engineering", "Epic ranged"],
  },
  {
    id: "tbc-acc-006",
    gameId: "tbc-anniversary",
    title: "Druid Healer Utility",
    serverId: "nightslayer-us",
    serverName: "Nightslayer US",
    faction: "Alliance",
    race: "Night Elf",
    className: "Druid",
    level: 70,
    price: 99,
    highlights: ["Dual set", "Flight form", "Raid attuned"],
  },
  {
    id: "tbc-acc-007",
    gameId: "tbc-anniversary",
    title: "Draenei Holy Priest",
    serverId: "thunderstrike-eu",
    serverName: "Thunderstrike EU",
    faction: "Alliance",
    race: "Draenei",
    className: "Priest",
    level: 70,
    price: 129,
    highlights: ["Healing set", "Heroic keys", "Jewelcrafting"],
  },
  {
    id: "tbc-acc-008",
    gameId: "tbc-anniversary",
    title: "Dwarf Protection Warrior",
    serverId: "spineshatter-eu",
    serverName: "Spineshatter EU",
    faction: "Alliance",
    race: "Dwarf",
    className: "Warrior",
    level: 70,
    price: 149,
    highlights: ["Tank set", "Blacksmithing", "Raid attuned"],
  },
  {
    id: "tbc-acc-009",
    gameId: "tbc-anniversary",
    title: "Troll Elemental Shaman",
    serverId: "nightslayer-us",
    serverName: "Nightslayer US",
    faction: "Horde",
    race: "Troll",
    className: "Shaman",
    level: 70,
    price: 109,
    highlights: ["Caster gear", "Totem set", "Enchanting"],
  },
  {
    id: "tbc-acc-010",
    gameId: "tbc-anniversary",
    title: "Tauren Arms Warrior",
    serverId: "dreamscythe-us",
    serverName: "Dreamscythe US",
    faction: "Horde",
    race: "Tauren",
    className: "Warrior",
    level: 70,
    price: 119,
    highlights: ["PvP set", "Mining", "Epic weapon"],
  },
  {
    id: "tbc-acc-011",
    gameId: "tbc-anniversary",
    title: "Orc Fury Warrior PvP",
    serverId: "nightslayer-us",
    serverName: "Nightslayer US",
    faction: "Horde",
    race: "Orc",
    className: "Warrior",
    level: 70,
    price: 169,
    highlights: ["Dual wield", "Arena set", "Engineering"],
  },
  {
    id: "tbc-acc-012",
    gameId: "tbc-anniversary",
    title: "Blood Elf Retribution Paladin",
    serverId: "spineshatter-eu",
    serverName: "Spineshatter EU",
    faction: "Horde",
    race: "Blood Elf",
    className: "Paladin",
    level: 70,
    price: 189,
    highlights: ["Retri set", "Epic mount", "Jewelcrafting"],
  },
];

export function getAccountsByGameId(gameId: string): AccountListing[] {
  return accountListings.filter((account) => account.gameId === gameId);
}
