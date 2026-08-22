"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleDashed,
  Copy,
  Hammer,
  Package,
  Percent,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";

import {
  type CategoryThemeKind,
  type DisplayRow,
  classifyFlow,
  deriveAction,
  deriveSource,
  deriveSourceDetail,
  formatAmount,
  formatDateTime,
  formatStatus,
  getRowThemeKind,
  getStatusTone,
} from "@/lib/activity-history-display";

const ICON_THEME: Record<CategoryThemeKind, { icon: typeof Sparkles; classes: string }> = {
  xp: { icon: Sparkles, classes: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
  progression: { icon: Shield, classes: "border-sky-400/40 bg-sky-500/10 text-sky-300" },
  purchase: { icon: ShoppingCart, classes: "border-amber-400/40 bg-amber-500/10 text-amber-300" },
  fee: { icon: Percent, classes: "border-violet-400/40 bg-violet-500/10 text-violet-300" },
  chest: { icon: Package, classes: "border-yellow-400/40 bg-yellow-500/10 text-yellow-300" },
  wallet: { icon: Wallet, classes: "border-cyan-400/40 bg-cyan-500/10 text-cyan-300" },
  crafting: { icon: Hammer, classes: "border-orange-400/40 bg-orange-500/10 text-orange-300" },
  admin: { icon: ShieldAlert, classes: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-300" },
  neutral: { icon: CircleDashed, classes: "border-slate-400/30 bg-slate-500/10 text-slate-300" },
};

type PremiumTransactionTableProps = {
  rows: DisplayRow[];
  loading?: boolean;
  emptyLabel?: string;
};

function BalanceImpact({ row }: { row: DisplayRow }) {
  const flow = classifyFlow(row);
  const text = flow === "gain" ? row.flowAdded : flow === "loss" ? row.flowRemoved : null;

  if (!text) {
    return <span className="text-sm font-semibold text-[#6f89a8]">—</span>;
  }

  const colorClass = flow === "gain" ? "text-emerald-300" : flow === "loss" ? "text-rose-300" : "text-[#9db7d4]";
  const Icon = flow === "loss" ? ArrowDownRight : ArrowUpRight;

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function ReferenceBadge({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore.
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1">
      <span className="truncate font-mono text-[0.68rem] text-[#9bb8d8]">{reference}</span>
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy reference"
        className="shrink-0 rounded-md p-0.5 text-[#6f89a8] transition hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function PremiumTransactionTable({ rows, loading = false, emptyLabel = "No transactions found." }: PremiumTransactionTableProps) {
  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-black/20 px-6 py-12 text-center text-sm font-semibold text-[#9db7d4]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b131d]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#7d97b6]">
              <th className="px-3 py-3 whitespace-nowrap">&nbsp;</th>
              <th className="px-3 py-3 whitespace-nowrap">Date &amp; Time</th>
              <th className="px-3 py-3 whitespace-nowrap">Action</th>
              <th className="px-3 py-3 whitespace-nowrap">Source</th>
              <th className="px-3 py-3 whitespace-nowrap">Reference</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Amount</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Balance Impact</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const action = deriveAction(row);
              const kind = getRowThemeKind(row, action);
              const theme = ICON_THEME[kind];
              const Icon = theme.icon;
              const date = formatDateTime(row.createdAt);
              const sourceMain = deriveSource(row);
              const sourceDetail = deriveSourceDetail(row);

              return (
                <tr key={row.id} className="border-b border-white/6 transition hover:bg-white/[0.03]">
                  <td className="px-3 py-3 align-middle">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${theme.classes}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-[#dbe8f8]">{date.day}</span>
                      <span className="text-xs font-medium text-[#7d97b6]">{date.hour}</span>
                    </div>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] ${theme.classes}`}>
                        {action}
                      </span>
                      {sourceDetail ? <span className="text-[0.68rem] font-medium text-[#7d97b6]">{sourceDetail}</span> : null}
                    </div>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="truncate text-sm font-semibold text-[#c7daef]">{sourceMain}</div>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <ReferenceBadge reference={row.reference} />
                  </td>

                  <td className="px-3 py-3 text-right align-middle">
                    <span className="whitespace-nowrap text-sm font-bold text-[#dbe8f8]">{formatAmount(row)}</span>
                  </td>

                  <td className="px-3 py-3 text-right align-middle">
                    <BalanceImpact row={row} />
                  </td>

                  <td className="px-3 py-3 text-center align-middle">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] ${getStatusTone(row.status)}`}>
                      {formatStatus(row.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div className="border-t border-white/8 px-4 py-3 text-center text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#7d97b6]">
          Loading more rows...
        </div>
      ) : null}
    </div>
  );
}
