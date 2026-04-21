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

export const accountClassOptions: AccountClass[] = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid",
];

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

export const accountRaceOptions: AccountRace[] = [
  "Human",
  "Orc",
  "Undead",
  "Troll",
  "Tauren",
  "Night Elf",
  "Dwarf",
  "Gnome",
  "Blood Elf",
  "Draenei",
];

export type AccountGender = "Male" | "Female";

export const accountGenderOptions: AccountGender[] = ["Male", "Female"];

export type AccountListing = {
  id: string;
  gameId: string;
  title: string;
  serverId: string;
  serverName: string;
  faction: "Horde" | "Alliance";
  gender: AccountGender;
  race: AccountRace;
  className: AccountClass;
  level: number;
  price: number;
  professionOne: string;
  professionTwo: string;
  highlights: string[];
};
