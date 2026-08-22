import type { ActivityCategory, ActivityHistoryLog } from "@/lib/activity-history-types";

export type DisplayRow = ActivityHistoryLog & {
  flowAdded?: string | null;
  flowRemoved?: string | null;
};

export function isChestRelatedEvent(item: ActivityHistoryLog): boolean {
  const origin = item.origin.toLowerCase();
  const description = item.description.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  const itemCategory = (item.itemCategory ?? "").toLowerCase();

  return (
    origin.includes("chest") ||
    description.includes("chest") ||
    description.includes("bau") ||
    tags.includes("chest") ||
    itemCategory === "chest"
  );
}

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function readMetaLabel(item: ActivityHistoryLog, key: string): string | null {
  const value = item.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function deriveAction(item: ActivityHistoryLog): string {
  const meta = readMetaLabel(item, "actionLabel");
  if (meta) {
    const normalizedMeta = meta.toLowerCase();
    if (normalizedMeta === "opened chest") return "Opened Chest";
    if (normalizedMeta === "chest used") return "Chest Used";
    if (normalizedMeta === "crafted item") return "Crafted Item";
    if (normalizedMeta === "materials consumed") return "Materials Consumed";
    if (normalizedMeta === "marketplace purchase") return "Marketplace Purchase";
    if (normalizedMeta === "sold item") return "Sold Item";
    if (normalizedMeta === "item posted on marketplace") return "Item Posted on Marketplace";
    if (normalizedMeta === "listing removed") return "Listing Removed";
    if (normalizedMeta === "marketplace fee") return "Marketplace Fee";
    if (normalizedMeta === "admin granted") return "Admin Granted";
    if (normalizedMeta === "daily reward") {
      return isChestRelatedEvent(item) ? "Received from Chest" : "Daily Reward";
    }

    return meta;
  }

  const action = item.actionType.toLowerCase();

  if (action === "chest_opened") return "Opened Chest";
  if (action === "chest_used") return "Chest Used";
  if (action === "craft_completed") return "Crafted Item";
  if (action === "craft_materials_consumed") return "Materials Consumed";
  if (action === "marketplace_item_bought") return "Marketplace Purchase";
  if (action === "marketplace_item_sold") return "Sold Item";
  if (action === "marketplace_item_listed") return "Item Posted on Marketplace";
  if (action === "marketplace_listing_removed") return "Listing Removed";
  if (action === "marketplace_fee_charged") return "Marketplace Fee";
  if (action.startsWith("admin_")) return "Admin Granted";
  if (action.includes("reward")) return isChestRelatedEvent(item) ? "Received from Chest" : "Daily Reward";

  return titleCase(item.actionType);
}

export function deriveSource(item: ActivityHistoryLog): string {
  const meta = readMetaLabel(item, "sourceLabel");
  if (meta) {
    const normalizedMeta = meta.toLowerCase();
    if (normalizedMeta === "inventory") return "Inventory";
    if (normalizedMeta === "admin panel") return "Admin Panel";
    if (normalizedMeta === "crafting system") return "Crafting System";
    return meta;
  }

  if (item.origin.includes("marketplace")) return "Marketplace";
  if (item.origin.includes("craft")) return "Crafting System";
  if (item.origin.includes("chests")) return item.itemName ?? "Chest";
  if (item.origin.includes("admin")) return "Admin Panel";
  if (item.category === "inventory") return "Inventory";
  return titleCase(item.origin.replace(/:/g, " "));
}

/** Secondary label under the source, derived from the last segment of the origin key (e.g. "stripe:webhook:level-rewards" -> "Level-Rewards"). */
export function deriveSourceDetail(item: ActivityHistoryLog): string | null {
  const segments = item.origin.split(":").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const last = segments[segments.length - 1]!;
  return last
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");
}

export function isNegativeFlow(item: ActivityHistoryLog): boolean {
  const action = item.actionType.toLowerCase();
  return (
    item.status === "failed" ||
    item.status === "rejected" ||
    item.status === "consumed" ||
    action.includes("fee") ||
    action.includes("chest_opened") ||
    action.includes("consumed") ||
    action.includes("listed") ||
    action.includes("buy") ||
    action.includes("withdraw")
  );
}

export function buildFlowFromItem(item: ActivityHistoryLog): { added: string | null; removed: string | null } {
  const action = item.actionType.toLowerCase();
  const rewardTitle =
    typeof item.metadata?.rewardTitle === "string" && item.metadata.rewardTitle.trim() ? item.metadata.rewardTitle.trim() : null;
  const valueText =
    typeof item.value === "number" && item.valueUnit === "loot"
      ? `${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LC`
      : typeof item.value === "number" && item.valueUnit === "usd"
        ? `$${item.value.toFixed(2)}`
        : typeof item.value === "number" && item.valueUnit === "xp"
          ? `${item.value.toFixed(2)} XP`
          : null;

  const itemText = item.itemName
    ? `${item.quantity ?? 1} ${item.itemName}`
    : typeof item.quantity === "number"
      ? String(item.quantity)
      : null;

  if (action === "marketplace_item_bought") {
    return {
      added: itemText ? `+${itemText}` : null,
      removed: valueText ? `-${valueText}` : null,
    };
  }

  if (action === "marketplace_item_sold") {
    return {
      added: valueText ? `+${valueText}` : null,
      removed: null,
    };
  }

  if (action === "marketplace_fee_charged" || action === "marketplace_item_listed" || item.status === "consumed") {
    return {
      added: null,
      removed: itemText ? `-${itemText}` : valueText ? `-${valueText}` : null,
    };
  }

  if (action === "chest_opened") {
    return {
      added: valueText ? `+${valueText}` : rewardTitle ? `+${rewardTitle}` : null,
      removed: null,
    };
  }

  const negative = isNegativeFlow(item);
  if (negative) {
    return {
      added: null,
      removed: itemText ? `-${itemText}` : valueText ? `-${valueText}` : null,
    };
  }

  return {
    added: itemText ? `+${itemText}` : valueText ? `+${valueText}` : null,
    removed: null,
  };
}

export function mergeDisplayRows(items: ActivityHistoryLog[]): DisplayRow[] {
  const usedIds = new Set<string>();
  const merged: DisplayRow[] = [];

  const findChestPair = (base: ActivityHistoryLog, expectedActionType: "chest_opened" | "chest_used") => {
    return items.find((candidate) => {
      if (candidate.id === base.id || usedIds.has(candidate.id)) {
        return false;
      }

      const sameItem =
        (candidate.itemId && base.itemId && candidate.itemId === base.itemId) ||
        (candidate.itemName && base.itemName && candidate.itemName === base.itemName);

      return (
        candidate.actionType === expectedActionType &&
        candidate.userUid === base.userUid &&
        sameItem &&
        Math.abs(candidate.createdAtMs - base.createdAtMs) <= 20000
      );
    });
  };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    if (usedIds.has(item.id)) {
      continue;
    }

    if (item.actionType === "chest_used") {
      const openedPair = findChestPair(item, "chest_opened");
      if (openedPair) {
        // Skip standalone rendering for chest_used; the paired chest_opened row will render both flows.
        usedIds.add(item.id);
        continue;
      }
    }

    if (item.actionType === "chest_opened") {
      const pair = findChestPair(item, "chest_used");

      if (pair) {
        usedIds.add(item.id);
        usedIds.add(pair.id);
        const openedFlow = buildFlowFromItem(item);
        const removedText = pair.itemName ? `-${pair.quantity ?? 1} ${pair.itemName}` : openedFlow.removed;

        merged.push({
          ...item,
          flowAdded: openedFlow.added,
          flowRemoved: removedText,
        });
        continue;
      }
    }

    const flow = buildFlowFromItem(item);
    merged.push({
      ...item,
      flowAdded: flow.added,
      flowRemoved: flow.removed,
    });
  }

  return merged;
}

export type CategoryThemeKind =
  | "xp"
  | "progression"
  | "purchase"
  | "fee"
  | "chest"
  | "wallet"
  | "crafting"
  | "admin"
  | "neutral";

export function getRowThemeKind(item: ActivityHistoryLog, action: string): CategoryThemeKind {
  const normalizedAction = action.toLowerCase();
  const rawAction = item.actionType.toLowerCase();

  if (rawAction.includes("withdraw") || rawAction.includes("deposit") || rawAction.includes("wallet")) {
    return "wallet";
  }

  if (normalizedAction.includes("fee")) {
    return "fee";
  }

  if (normalizedAction.includes("opened chest") || normalizedAction.includes("chest used") || item.category === "chests") {
    return "chest";
  }

  if (normalizedAction.includes("crafted") || normalizedAction.includes("materials consumed") || item.category === "crafting") {
    return "crafting";
  }

  if (normalizedAction.includes("purchase") || normalizedAction.includes("sold") || normalizedAction.includes("posted") || normalizedAction.includes("listing")) {
    return "purchase";
  }

  if (item.category === "admin" || rawAction.startsWith("admin_")) {
    return "admin";
  }

  if (item.valueUnit === "xp" || rawAction.includes("xp")) {
    return "xp";
  }

  if (normalizedAction.includes("progression") || item.category === "progression") {
    return "progression";
  }

  return "neutral";
}

export function formatStatus(status: string): string {
  if (status === "admin_action") return "Admin Action";
  if (status === "completed") return "Completed";
  if (status === "consumed") return "Consumed";
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "system") return "System";
  return titleCase(status);
}

export function getStatusTone(status: string) {
  if (status === "completed" || status === "approved") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (status === "consumed") return "border-rose-400/40 bg-rose-500/10 text-rose-300";
  if (status === "admin_action") return "border-amber-300/40 bg-amber-500/10 text-amber-200";
  if (status === "pending") return "border-yellow-300/40 bg-yellow-500/10 text-yellow-200";
  if (status === "failed" || status === "rejected") return "border-red-400/40 bg-red-600/10 text-red-300";
  if (status === "cancelled") return "border-slate-300/25 bg-slate-500/10 text-slate-300";
  return "border-sky-300/35 bg-sky-500/10 text-sky-300";
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return { day: "--/--/----", hour: "--:--" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--/--/----", hour: "--:--" };
  }

  return {
    day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hour: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export type FlowClass = "gain" | "loss" | "neutral";

export function classifyFlow(row: DisplayRow): FlowClass {
  if (row.flowAdded && !row.flowRemoved) return "gain";
  if (row.flowRemoved && !row.flowAdded) return "loss";
  if (row.flowAdded && row.flowRemoved) return "gain";
  return "neutral";
}

export function formatAmount(item: ActivityHistoryLog): string {
  if (typeof item.value !== "number") {
    return "—";
  }

  if (item.valueUnit === "usd") {
    return item.value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  if (item.valueUnit === "loot") {
    return `${item.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} LC`;
  }

  if (item.valueUnit === "xp") {
    return `${item.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} XP`;
  }

  return item.value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function normalizeSearchIndex(item: ActivityHistoryLog): string {
  return [item.reference, item.description, item.itemName, item.origin, item.actionType, item.rarity]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export type { ActivityCategory };
