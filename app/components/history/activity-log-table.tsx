"use client";

import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDashed, Shield, Sparkles, Store } from "lucide-react";

import type { ActivityCategory, ActivityHistoryLog } from "@/lib/activity-history-types";

type ActivityLogTableProps = {
  items: ActivityHistoryLog[];
  loadingMore?: boolean;
  emptyLabel?: string;
  showUserColumn?: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getReceivedFrom(item: ActivityHistoryLog) {
  const origin = item.origin.toLowerCase();

  if (item.category === "marketplace" || origin.includes("marketplace")) return "Marketplace";
  if (item.category === "chests" || origin.includes("chest")) return "Chest Opening";
  if (item.category === "crafting" || origin.includes("craft")) return "Crafting";
  if (item.category === "admin" || item.actorRole === "admin" || origin.includes("admin")) return "Admin";
  if (item.actionType.includes("purchase")) return "Purchase";
  if (item.actionType.includes("reward")) return "Reward";
  if (item.actorRole === "system") return "System";
  if (item.category === "progression") return "Progression";
  return "Wallet";
}

function getName(item: ActivityHistoryLog) {
  if (item.itemName && item.quantity && item.quantity > 1) {
    return `${item.itemName} x${item.quantity}`;
  }

  if (item.itemName) {
    return item.itemName;
  }

  return item.description;
}

function getTypeLabel(item: ActivityHistoryLog) {
  const action = item.actionType.toLowerCase();
  if (action.includes("buy") || action.includes("purchase")) return "BUY";
  if (action.includes("sell")) return "SELL";
  if (action.includes("open")) return "OPEN";
  if (action.includes("craft")) return "CRAFT";
  if (item.category === "admin" || item.actorRole === "admin") return "ADMIN";
  if (action.includes("reward") || item.category === "progression") return "REWARD";
  return "SYSTEM";
}

function getAmountTone(item: ActivityHistoryLog) {
  const action = item.actionType.toLowerCase();
  const isLoss =
    action.includes("withdraw") ||
    action.includes("fee") ||
    action.includes("consumed") ||
    action.includes("removed") ||
    action.includes("buy") ||
    action.includes("listed") ||
    item.status === "failed";

  return isLoss ? "text-rose-300" : "text-emerald-300";
}

function getAmountText(item: ActivityHistoryLog) {
  const action = item.actionType.toLowerCase();
  const isLoss =
    action.includes("withdraw") ||
    action.includes("fee") ||
    action.includes("consumed") ||
    action.includes("removed") ||
    action.includes("buy") ||
    action.includes("listed");

  const sign = isLoss ? "-" : "+";

  if (typeof item.value === "number" && item.valueUnit) {
    if (item.valueUnit === "loot") {
      return `${sign}${item.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} LC`;
    }

    if (item.valueUnit === "usd") {
      return `${sign}$${item.value.toFixed(2)}`;
    }

    if (item.valueUnit === "xp") {
      return `${sign}${item.value.toFixed(2)} XP`;
    }
  }

  if (item.itemName) {
    return `${sign}${item.quantity ?? 1} ${item.itemName}`;
  }

  return "--";
}

function getTypeTone(type: string, category: ActivityCategory) {
  if (type === "BUY") return "border-rose-400/25 bg-rose-500/12 text-rose-100";
  if (type === "SELL") return "border-emerald-400/25 bg-emerald-500/12 text-emerald-100";
  if (type === "OPEN") return "border-sky-400/25 bg-sky-500/12 text-sky-100";
  if (type === "CRAFT") return "border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-100";
  if (type === "ADMIN" || category === "admin") return "border-amber-400/25 bg-amber-500/12 text-amber-100";
  return "border-slate-300/15 bg-slate-200/10 text-slate-100";
}

function getStatusTone(status: string) {
  if (status === "completed" || status === "approved") return "border-emerald-400/25 bg-emerald-500/12 text-emerald-100";
  if (status === "pending") return "border-amber-400/25 bg-amber-500/12 text-amber-100";
  if (status === "failed" || status === "rejected") return "border-rose-500/30 bg-rose-600/14 text-rose-100";
  if (status === "cancelled") return "border-slate-300/15 bg-slate-200/10 text-slate-100";
  return "border-sky-400/25 bg-sky-500/12 text-sky-100";
}

function getRowAccent(category: ActivityCategory) {
  if (category === "marketplace") return "before:bg-sky-400/70";
  if (category === "crafting") return "before:bg-fuchsia-400/70";
  if (category === "admin") return "before:bg-amber-400/70";
  if (category === "economy") return "before:bg-emerald-400/70";
  return "before:bg-white/25";
}

function getCategoryIcon(category: ActivityCategory) {
  if (category === "marketplace") return Store;
  if (category === "admin") return Shield;
  if (category === "chests") return Sparkles;
  return CheckCircle2;
}

export function ActivityLogTable({ items, loadingMore = false, emptyLabel = "No records found.", showUserColumn = false }: ActivityLogTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/20 px-6 py-10 text-center text-sm font-semibold text-[#9db7d4]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#07111a]/90 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
      <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(11,20,32,0.98),rgba(9,16,26,0.96))] backdrop-blur">
            <tr className="border-b border-white/10 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#8fb0d2]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Received From</th>
              {showUserColumn ? <th className="px-4 py-3">User</th> : null}
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const typeLabel = getTypeLabel(item);
              const Icon = getCategoryIcon(item.category);

              return (
                <tr
                  key={item.id}
                  className={`group relative border-b border-white/6 transition hover:bg-white/[0.045] ${getRowAccent(item.category)} before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-['']`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[#dbe8f8]">{formatDate(item.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-[#b9cce3]">
                      <Icon className="h-3.5 w-3.5" />
                      {getReceivedFrom(item)}
                    </span>
                  </td>
                  {showUserColumn ? (
                    <td className="max-w-[220px] px-4 py-3 text-[#dbe8f8]">
                      <div className="truncate font-semibold">{item.relatedUserName ?? item.userUid}</div>
                      {item.relatedUserName ? <div className="truncate font-mono text-[0.68rem] text-[#8fb0d2]">{item.userUid}</div> : null}
                    </td>
                  ) : null}
                  <td className="max-w-[260px] truncate px-4 py-3 text-[#f4f8fc]">{getName(item)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#8fb0d2]">{item.reference}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-black ${getAmountTone(item)}`}>
                    <span className="inline-flex items-center gap-1">
                      {getAmountTone(item).includes("emerald") ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                      {getAmountText(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${getTypeTone(typeLabel, item.category)}`}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${getStatusTone(item.status)}`}>
                      {formatLabel(item.status)}
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
          {loadingMore ? "Loading more rows" : `${items.length} rows loaded`}
        </span>
      </div>
    </div>
  );
}
