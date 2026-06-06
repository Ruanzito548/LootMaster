export const ACTIVITY_CATEGORIES = [
  "economy",
  "marketplace",
  "inventory",
  "chests",
  "crafting",
  "admin",
  "progression",
] as const;

export const ACTIVITY_STATUSES = [
  "completed",
  "pending",
  "failed",
  "cancelled",
  "rejected",
  "approved",
  "system",
  "consumed",
  "admin_action",
] as const;

export const ACTIVITY_VALUE_UNITS = ["loot", "usd", "brl", "xp", "item"] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export type ActivityValueUnit = (typeof ACTIVITY_VALUE_UNITS)[number];
export type ActivityActorRole = "user" | "admin" | "system";

export type ActivityMetadataValue = string | number | boolean | null;

export type ActivityHistoryLog = {
  id: string;
  reference: string;
  userUid: string;
  actorUid: string | null;
  actorRole: ActivityActorRole;
  actionType: string;
  category: ActivityCategory;
  description: string;
  itemId: string | null;
  itemName: string | null;
  itemCategory: string | null;
  quantity: number | null;
  value: number | null;
  valueUnit: ActivityValueUnit | null;
  relatedUserUid: string | null;
  relatedUserName: string | null;
  rarity: string | null;
  origin: string;
  status: ActivityStatus;
  createdAtMs: number;
  createdAt: string | null;
  sortKey: string;
  tags: string[];
  metadata: Record<string, ActivityMetadataValue>;
};

export type ActivityHistoryLogInput = {
  userUid: string;
  actorUid?: string | null;
  actorRole?: ActivityActorRole;
  actionType: string;
  category: ActivityCategory;
  description: string;
  itemId?: string | null;
  itemName?: string | null;
  itemCategory?: string | null;
  quantity?: number | null;
  value?: number | null;
  valueUnit?: ActivityValueUnit | null;
  relatedUserUid?: string | null;
  relatedUserName?: string | null;
  rarity?: string | null;
  origin: string;
  status: ActivityStatus;
  tags?: string[];
  metadata?: Record<string, ActivityMetadataValue>;
  mirrorToAdminAudit?: boolean;
};

export type ActivityHistoryPage = {
  items: ActivityHistoryLog[];
  nextCursor: string | null;
};
