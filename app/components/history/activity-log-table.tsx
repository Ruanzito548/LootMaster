"use client";

import { ArrowDownLeft, ArrowUpRight, CircleDashed, Shield, Sparkles, Store, Wrench } from "lucide-react";

import type { ActivityCategory, ActivityHistoryLog } from "@/lib/activity-history-types";

type ActivityLogTableProps = {
  items: ActivityHistoryLog[];
  loadingMore?: boolean;
  emptyLabel?: string;
  showUserColumn?: boolean;
};

type RowSemantic = {
  action: string;
  source: string;
};

type DisplayRow = ActivityHistoryLog & {
  flowAdded?: string | null;
  flowRemoved?: string | null;
};

function isChestRelatedEvent(item: ActivityHistoryLog): boolean {
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

function formatDateTime(value: string | null) {
  if (!value) {
    return { day: "--/--/----", hour: "--:--" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--/--/----", hour: "--:--" };
  }

  return {
    day: date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    hour: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readMetaLabel(item: ActivityHistoryLog, key: string): string | null {
  const value = item.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deriveAction(item: ActivityHistoryLog): string {
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

function deriveSource(item: ActivityHistoryLog): string {
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

function deriveSemantic(item: ActivityHistoryLog): RowSemantic {
  return {
    action: deriveAction(item),
    source: deriveSource(item),
  };
}

function isNegativeFlow(item: ActivityHistoryLog): boolean {
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

function buildFlowFromItem(item: ActivityHistoryLog): { added: string | null; removed: string | null } {
  const action = item.actionType.toLowerCase();
  const rewardTitle = typeof item.metadata?.rewardTitle === "string" && item.metadata.rewardTitle.trim() ? item.metadata.rewardTitle.trim() : null;
  const valueText =
    typeof item.value === "number" && item.valueUnit === "loot"
      ? `${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LC`
      : typeof item.value === "number" && item.valueUnit === "usd"
        ? `$${item.value.toFixed(2)}`
        : typeof item.value === "number" && item.valueUnit === "xp"
          ? `${item.value.toFixed(2)} XP`
          : null;

  const itemText = item.itemName ? `${item.quantity ?? 1} ${item.itemName}` : typeof item.quantity === "number" ? String(item.quantity) : null;

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

function mergeDisplayRows(items: ActivityHistoryLog[]): DisplayRow[] {
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

function getCategoryTheme(category: ActivityCategory, action: string) {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes("opened chest") || category === "chests") {
    return {
      accentBorder: "border-cyan-400/85",
      badge: "border-cyan-300/35 bg-cyan-500/16 text-cyan-100",
      icon: Sparkles,
    };
  }

  if (normalizedAction.includes("used") || normalizedAction.includes("consumed") || category === "inventory") {
    return {
      accentBorder: "border-rose-400/85",
      badge: "border-rose-300/35 bg-rose-500/16 text-rose-100",
      icon: ArrowUpRight,
    };
  }

  if (category === "marketplace") {
    return {
      accentBorder: "border-violet-400/85",
      badge: "border-violet-300/35 bg-violet-500/16 text-violet-100",
      icon: Store,
    };
  }

  if (category === "admin") {
    return {
      accentBorder: "border-amber-300/85",
      badge: "border-amber-300/40 bg-amber-500/18 text-amber-100",
      icon: Shield,
    };
  }

  if (category === "crafting") {
    return {
      accentBorder: "border-orange-400/85",
      badge: "border-orange-300/35 bg-orange-500/16 text-orange-100",
      icon: Wrench,
    };
  }

  if (category === "economy" || category === "progression") {
    return {
      accentBorder: "border-emerald-400/85",
      badge: "border-emerald-300/35 bg-emerald-500/16 text-emerald-100",
      icon: ArrowDownLeft,
    };
  }

  return {
    accentBorder: "border-slate-300/45",
    badge: "border-slate-300/25 bg-slate-500/16 text-slate-100",
    icon: CircleDashed,
  };
}

function getStatusTone(status: string) {
  if (status === "completed" || status === "approved") return "border-emerald-300/35 bg-emerald-500/16 text-emerald-100";
  if (status === "consumed") return "border-rose-300/35 bg-rose-500/16 text-rose-100";
  if (status === "admin_action") return "border-amber-300/45 bg-amber-500/18 text-amber-100";
  if (status === "pending") return "border-yellow-300/35 bg-yellow-500/16 text-yellow-100";
  if (status === "failed" || status === "rejected") return "border-red-400/42 bg-red-600/20 text-red-100";
  if (status === "cancelled") return "border-slate-300/25 bg-slate-500/16 text-slate-100";
  return "border-sky-300/35 bg-sky-500/16 text-sky-100";
}

function formatStatus(status: string): string {
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

export function ActivityLogTable({ items, loadingMore = false, emptyLabel = "No records found.", showUserColumn = false }: ActivityLogTableProps) {
  const displayItems = mergeDisplayRows(items);

  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/20 px-6 py-10 text-center text-sm font-semibold text-[#9db7d4]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#060f1a]/95 shadow-[0_22px_64px_rgba(0,0,0,0.32)]">
      <div className="max-h-[72vh] overflow-auto">
        <table className="min-w-full table-fixed border-collapse text-left text-sm">
          {showUserColumn ? (
            <colgroup>
              <col className="w-[130px]" />
              <col className="w-[220px]" />
              <col className="w-[190px]" />
              <col className="w-[170px]" />
              <col className="w-[180px]" />
              <col className="w-[190px]" />
              <col className="w-[190px]" />
              <col className="w-[140px]" />
            </colgroup>
          ) : (
            <colgroup>
              <col className="w-[130px]" />
              <col className="w-[220px]" />
              <col className="w-[170px]" />
              <col className="w-[180px]" />
              <col className="w-[200px]" />
              <col className="w-[200px]" />
              <col className="w-[140px]" />
            </colgroup>
          )}
          <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(10,19,32,0.98),rgba(8,15,27,0.97))] backdrop-blur">
            <tr className="border-b border-white/10 text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#8fb0d2]">
              <th className="px-4 py-3 whitespace-nowrap">Date</th>
              {showUserColumn ? <th className="px-4 py-3 whitespace-nowrap">User</th> : null}
              <th className="px-4 py-3 whitespace-nowrap">Action</th>
              <th className="px-4 py-3 whitespace-nowrap">Source</th>
              <th className="px-4 py-3 whitespace-nowrap">Reference</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">Added</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">Removed</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => {
              const semantic = deriveSemantic(item);
              const date = formatDateTime(item.createdAt);
              const theme = getCategoryTheme(item.category, semantic.action);
              const ActionIcon = theme.icon;

              return (
                <tr
                  key={item.id}
                  className="group h-[66px] border-b border-white/7 align-middle transition hover:bg-white/[0.05]"
                >
                  <td className={`border-l-[3px] px-4 py-2 align-middle ${theme.accentBorder}`}>
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-[#dbe8f8]">{date.day}</span>
                      <span className="text-xs font-semibold text-[#8fb0d2]">{date.hour}</span>
                    </div>
                  </td>

                  {showUserColumn ? (
                    <td className="px-4 py-2 align-middle">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#e6f1ff]">{item.userDisplayName ?? item.relatedUserName ?? "Unknown User"}</div>
                        <div className="truncate font-mono text-[0.67rem] text-[#8fb0d2]">{item.userShortId ? `USER #${item.userShortId}` : item.userUid}</div>
                      </div>
                    </td>
                  ) : null}

                  <td className="px-4 py-2 align-middle">
                    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${theme.badge}`}>
                      <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{semantic.action}</span>
                    </span>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <div className="truncate font-semibold text-[#c7daef]">{semantic.source}</div>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <div className="truncate rounded-md border border-white/12 bg-black/25 px-2 py-1 font-mono text-[0.67rem] text-[#9bb8d8]">{item.reference}</div>
                  </td>

                  <td className="px-5 py-2 text-right align-middle">
                    {item.flowAdded ? (
                      <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[0.78rem] font-black text-emerald-300">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        {item.flowAdded}
                      </span>
                    ) : (
                      <span className="text-[0.78rem] font-black text-[#8fb0d2]">--</span>
                    )}
                  </td>

                  <td className="px-5 py-2 text-right align-middle">
                    {item.flowRemoved ? (
                      <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[0.78rem] font-black text-rose-300">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {item.flowRemoved}
                      </span>
                    ) : (
                      <span className="text-[0.78rem] font-black text-[#8fb0d2]">--</span>
                    )}
                  </td>

                  <td className="px-4 py-2 text-center align-middle">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${getStatusTone(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center border-t border-white/8 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#8ea9c8]">
          <CircleDashed className="h-3.5 w-3.5" />
          {loadingMore ? "Loading more rows" : `${displayItems.length} rows loaded`}
        </span>
      </div>
    </div>
  );
}
