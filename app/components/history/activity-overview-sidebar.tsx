"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Hammer, Package, Percent, Shield, ShoppingCart, Sparkles, Wallet, type LucideIcon } from "lucide-react";

import {
  type CategoryThemeKind,
  type DisplayRow,
  classifyFlow,
  deriveAction,
  deriveSource,
  deriveSourceDetail,
  getRowThemeKind,
} from "@/lib/activity-history-display";

const TOP_ACTION_ICONS: Record<CategoryThemeKind, LucideIcon> = {
  xp: Sparkles,
  progression: Shield,
  purchase: ShoppingCart,
  fee: Percent,
  chest: Package,
  wallet: Wallet,
  crafting: Hammer,
  admin: Shield,
  neutral: Package,
};

type ActivityOverviewSidebarProps = {
  rows: DisplayRow[];
};

export function ActivityOverviewSidebar({ rows }: ActivityOverviewSidebarProps) {
  const [period, setPeriod] = useState<"period" | "all">("period");

  const stats = useMemo(() => {
    const total = rows.length;
    let gains = 0;
    let losses = 0;
    let neutral = 0;

    for (const row of rows) {
      const flow = classifyFlow(row);
      if (flow === "gain") gains += 1;
      else if (flow === "loss") losses += 1;
      else neutral += 1;
    }

    const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);

    return {
      total,
      gains,
      losses,
      neutral,
      gainsPct: pct(gains),
      lossesPct: pct(losses),
      neutralPct: pct(neutral),
    };
  }, [rows]);

  const topActions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; kind: CategoryThemeKind }>();

    for (const row of rows) {
      const action = deriveAction(row);
      const kind = getRowThemeKind(row, action);
      const label = deriveSourceDetail(row) ?? deriveSource(row);
      const existing = counts.get(label);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(label, { label, count: 1, kind });
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rows]);

  const donutGradient = `conic-gradient(#34d399 0% ${stats.gainsPct}%, #fb7185 ${stats.gainsPct}% ${stats.gainsPct + stats.lossesPct}%, #64748b ${stats.gainsPct + stats.lossesPct}% 100%)`;

  return (
    <aside className="flex flex-col gap-5">
      <section className="rounded-[1.25rem] border border-white/10 bg-[#0b131d] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#dbe8f8]">Activity Overview</p>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as "period" | "all")}
            className="rounded-lg border border-white/12 bg-black/25 px-2 py-1 text-[0.66rem] font-semibold text-[#c7daef] outline-none focus:border-[#f2c879]"
          >
            <option value="period">This period</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <div
            className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
            style={{ background: stats.total > 0 ? donutGradient : "#1b2734" }}
          >
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#0b131d]">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[#7d97b6]">Total</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-2 text-[#c7daef]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Gains
              <span className="ml-auto text-[#7d97b6]">
                {stats.gains} ({stats.gainsPct.toFixed(1)}%)
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-[#c7daef]">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              Losses
              <span className="ml-auto text-[#7d97b6]">
                {stats.losses} ({stats.lossesPct.toFixed(1)}%)
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-[#c7daef]">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Neutral
              <span className="ml-auto text-[#7d97b6]">
                {stats.neutral} ({stats.neutralPct.toFixed(1)}%)
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-white/10 bg-[#0b131d] p-5">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#dbe8f8]">Top Actions</p>

        {topActions.length === 0 ? (
          <p className="mt-4 text-xs font-medium text-[#7d97b6]">No activity yet.</p>
        ) : (
          <div className="mt-4 flex flex-col">
            {topActions.map(({ label, count, kind }, index) => {
              const Icon = TOP_ACTION_ICONS[kind];
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 py-2.5 ${index > 0 ? "border-t border-white/6" : ""}`}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-[#c7daef]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-[#c7daef]">{label}</span>
                  <span className="ml-auto text-sm font-black text-white">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-[#f2c879]/25 bg-gradient-to-br from-[#1a1408] via-[#0b131d] to-[#0b131d] p-5">
        <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 opacity-40">
          <Image src="/chest.png" alt="" fill sizes="112px" className="object-contain" />
        </div>
        <div className="relative max-w-[75%]">
          <p className="text-sm font-black text-[#f2c879]">Every action builds your journey.</p>
          <p className="mt-2 text-xs font-medium leading-5 text-[#c7daef]">Keep earning, keep growing!</p>
        </div>
      </section>
    </aside>
  );
}
