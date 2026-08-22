"use client";

type CommissionDonutProps = {
  totalLabel: string;
  earned: { cents: number; label: string; pct: number };
  pending: { cents: number; label: string; pct: number };
  available: { cents: number; label: string; pct: number };
};

export function CommissionDonut({ totalLabel, earned, pending, available }: CommissionDonutProps) {
  const ringStyle =
    earned.cents > 0
      ? { background: "conic-gradient(#22d3ee 0% 100%)" }
      : { background: "#1b2734" };

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={ringStyle}>
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#0a121c]">
          <span className="text-xl font-black text-white">{totalLabel}</span>
          <span className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[#7d97b6]">Total</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 text-[#c7daef]">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          Earned
          <span className="ml-auto pl-4 text-[#7d97b6]">
            {earned.label} ({earned.pct.toFixed(1)}%)
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-[#c7daef]">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          Pending
          <span className="ml-auto pl-4 text-[#7d97b6]">
            {pending.label} ({pending.pct.toFixed(1)}%)
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-[#c7daef]">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Available
          <span className="ml-auto pl-4 text-[#7d97b6]">
            {available.label} ({available.pct.toFixed(1)}%)
          </span>
        </span>
      </div>
    </div>
  );
}
