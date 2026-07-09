"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

export type DashboardOrder = {
  id: string;
  createdUnix: number;
  amountTotal: number;
  currency: string;
  statusLabel: string;
  gameTitle: string;
  categoryTitle: string;
  paymentMethod: string;
  nickname: string;
  email: string;
  commissionPercent: number;
  sellerAmountCents: number;
  platformProfitCents: number;
};

type DashboardClientProps = {
  orders: DashboardOrder[];
  loadError: string | null;
  initialGlobalPlatformFeePercent: number;
};

type RangeValue = "7" | "30" | "90" | "all";
type ChartScope = "weekly" | "monthly" | "yearly";

type RevenueBucket = {
  key: string;
  label: string;
  fullLabel: string;
  startMs: number;
  endMs: number;
  revenueCents: number;
  ordersCount: number;
};

function formatMoney(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDateTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("pt-BR");
}

function getRangeStartMs(range: RangeValue): number | null {
  if (range === "all") return null;
  const days = Number(range);
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function startOfDay(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function buildCurrentBuckets(scope: ChartScope, nowMs: number): RevenueBucket[] {
  const buckets: RevenueBucket[] = [];

  if (scope === "weekly") {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayStart = startOfDay(nowMs);
    const periodStart = todayStart - oneDayMs * 6;

    for (let index = 0; index < 7; index += 1) {
      const startMs = periodStart + index * oneDayMs;
      const endMs = startMs + oneDayMs;
      const date = new Date(startMs);
      const weekday = date
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "")
        .slice(0, 3);

      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        label: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        fullLabel: date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        startMs,
        endMs,
        revenueCents: 0,
        ordersCount: 0,
      });
    }

    return buckets;
  }

  if (scope === "monthly") {
    const now = new Date(nowMs);
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const startMs = new Date(year, month, day, 0, 0, 0, 0).getTime();
      const endMs = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();

      buckets.push({
        key: `${year}-${month + 1}-${day}`,
        label: String(day).padStart(2, "0"),
        fullLabel: new Date(startMs).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        startMs,
        endMs,
        revenueCents: 0,
        ordersCount: 0,
      });
    }

    return buckets;
  }

  const now = new Date(nowMs);
  const year = now.getFullYear();
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (let month = 0; month < 12; month += 1) {
    const startMs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();

    buckets.push({
      key: `${year}-${month + 1}`,
      label: monthLabels[month],
      fullLabel: new Date(startMs).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
      startMs,
      endMs,
      revenueCents: 0,
      ordersCount: 0,
    });
  }

  return buckets;
}

function buildPreviousBuckets(scope: ChartScope, nowMs: number): RevenueBucket[] {
  if (scope === "weekly") {
    return buildCurrentBuckets(scope, nowMs - 7 * 24 * 60 * 60 * 1000);
  }

  if (scope === "monthly") {
    const now = new Date(nowMs);
    const previousMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0, 0).getTime();
    return buildCurrentBuckets(scope, previousMonthAnchor);
  }

  const now = new Date(nowMs);
  const previousYearAnchor = new Date(now.getFullYear() - 1, 6, 15, 12, 0, 0, 0).getTime();
  return buildCurrentBuckets(scope, previousYearAnchor);
}

function fillBucketsWithOrders(buckets: RevenueBucket[], inputOrders: DashboardOrder[]): RevenueBucket[] {
  const next = buckets.map((bucket) => ({ ...bucket }));

  for (const order of inputOrders) {
    const createdMs = order.createdUnix * 1000;

    for (let index = 0; index < next.length; index += 1) {
      const bucket = next[index];

      if (createdMs >= bucket.startMs && createdMs < bucket.endMs) {
        bucket.revenueCents += order.amountTotal;
        bucket.ordersCount += 1;
        break;
      }
    }
  }

  return next;
}

function buildReferenceLines(maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const step = safeMax / 4;

  return [4, 3, 2, 1, 0].map((multiplier) => {
    const value = Math.round(step * multiplier);
    const positionPercent = (value / safeMax) * 100;

    return {
      value,
      positionPercent,
    };
  });
}

export function DashboardClient({
  orders,
  loadError,
  initialGlobalPlatformFeePercent,
}: DashboardClientProps) {
  const [range, setRange] = useState<RangeValue>("30");
  const [chartScope, setChartScope] = useState<ChartScope>("weekly");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [globalFeeInput, setGlobalFeeInput] = useState(initialGlobalPlatformFeePercent.toFixed(2));
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);
  const [chartAnimated, setChartAnimated] = useState(false);

  useEffect(() => {
    setChartAnimated(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setChartAnimated(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [chartScope, statusFilter, gameFilter, paymentFilter]);

  const statusOptions = ["all", ...Array.from(new Set(orders.map((order) => order.statusLabel)))];
  const gameOptions = ["all", ...Array.from(new Set(orders.map((order) => order.gameTitle)))];
  const paymentOptions = ["all", ...Array.from(new Set(orders.map((order) => order.paymentMethod)))];

  const baseFilteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.statusLabel !== statusFilter) return false;
    if (gameFilter !== "all" && order.gameTitle !== gameFilter) return false;
    if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter) return false;
    return true;
  });

  const rangeStart = getRangeStartMs(range);
  const dashboardFilteredOrders = baseFilteredOrders.filter((order) => {
    const createdMs = order.createdUnix * 1000;
    return rangeStart ? createdMs >= rangeStart : true;
  });

  const totalRevenue = dashboardFilteredOrders.reduce((acc, order) => acc + order.amountTotal, 0);
  const totalPayout = dashboardFilteredOrders.reduce((acc, order) => acc + order.sellerAmountCents, 0);
  const totalPlatformProfit = dashboardFilteredOrders.reduce((acc, order) => acc + order.platformProfitCents, 0);
  const totalOrders = dashboardFilteredOrders.length;
  const paidOrders = dashboardFilteredOrders.filter((order) => {
    const label = order.statusLabel.toLowerCase();
    return label === "paid" || label === "pago" || label === "completed" || label === "concluido";
  }).length;
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const averageCommissionPercent = totalRevenue > 0 ? (totalPlatformProfit / totalRevenue) * 100 : 0;

  const statusGrouped = new Map<string, number>();
  for (const order of dashboardFilteredOrders) {
    statusGrouped.set(order.statusLabel, (statusGrouped.get(order.statusLabel) || 0) + 1);
  }

  const statusBreakdown = Array.from(statusGrouped.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const gameRevenueGrouped = new Map<string, number>();
  for (const order of dashboardFilteredOrders) {
    gameRevenueGrouped.set(order.gameTitle, (gameRevenueGrouped.get(order.gameTitle) || 0) + order.amountTotal);
  }

  const gameRevenue = Array.from(gameRevenueGrouped.entries())
    .map(([game, value]) => ({ game, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topGameMax = Math.max(...gameRevenue.map((item) => item.value), 1);

  const paymentMixGrouped = new Map<string, { count: number; value: number }>();
  for (const order of dashboardFilteredOrders) {
    const key = order.paymentMethod || "--";
    const current = paymentMixGrouped.get(key) ?? { count: 0, value: 0 };
    paymentMixGrouped.set(key, {
      count: current.count + 1,
      value: current.value + order.amountTotal,
    });
  }

  const paymentMix = Array.from(paymentMixGrouped.entries())
    .map(([method, value]) => ({ method, ...value }))
    .sort((a, b) => b.value - a.value);

  const taxSegments = [
    {
      label: "Repasse",
      value: totalPayout,
      color: "from-emerald-400 to-emerald-200",
    },
    {
      label: "Lucro",
      value: totalPlatformProfit,
      color: "from-cyan-400 to-sky-300",
    },
  ];

  const taxTotalMax = Math.max(...taxSegments.map((segment) => segment.value), 1);

  const recentOrders = [...dashboardFilteredOrders].sort((a, b) => b.createdUnix - a.createdUnix).slice(0, 8);

  const nowMs = Date.now();
  const currentBuckets = fillBucketsWithOrders(buildCurrentBuckets(chartScope, nowMs), baseFilteredOrders);
  const previousBuckets = fillBucketsWithOrders(buildPreviousBuckets(chartScope, nowMs), baseFilteredOrders);

  const chartMaxValue = Math.max(...currentBuckets.map((bucket) => bucket.revenueCents), 1);
  const chartReferenceLines = buildReferenceLines(chartMaxValue);
  const chartTotalRevenue = currentBuckets.reduce((acc, bucket) => acc + bucket.revenueCents, 0);
  const chartTotalOrders = currentBuckets.reduce((acc, bucket) => acc + bucket.ordersCount, 0);
  const chartAverageRevenue = currentBuckets.length > 0 ? Math.round(chartTotalRevenue / currentBuckets.length) : 0;
  const chartTicketAverage = chartTotalOrders > 0 ? Math.round(chartTotalRevenue / chartTotalOrders) : 0;

  const nonZeroBuckets = currentBuckets.filter((bucket) => bucket.revenueCents > 0);
  const chartBestBucket =
    nonZeroBuckets.length > 0
      ? nonZeroBuckets.reduce((best, current) => (current.revenueCents > best.revenueCents ? current : best), nonZeroBuckets[0])
      : null;
  const chartWorstBucket =
    nonZeroBuckets.length > 0
      ? nonZeroBuckets.reduce((worst, current) => (current.revenueCents < worst.revenueCents ? current : worst), nonZeroBuckets[0])
      : null;

  const previousRevenue = previousBuckets.reduce((acc, bucket) => acc + bucket.revenueCents, 0);
  const growthPercent =
    previousRevenue > 0
      ? ((chartTotalRevenue - previousRevenue) / previousRevenue) * 100
      : chartTotalRevenue > 0
        ? 100
        : 0;

  async function saveGlobalSiteFee() {
    if (savingSettings) {
      return;
    }

    const parsed = Number(globalFeeInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setSettingsError("A taxa global deve estar entre 0 e 100.");
      setSettingsMessage(null);
      return;
    }

    if (!auth?.currentUser) {
      setSettingsError("Faça login com uma conta admin para salvar configurações.");
      setSettingsMessage(null);
      return;
    }

    setSavingSettings(true);
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/dashboard-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          globalPlatformFeePercent: parsed,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        settings?: { globalPlatformFeePercent: number };
      };

      if (!response.ok || !data.ok || !data.settings) {
        setSettingsError(data.error ?? "Não foi possível salvar a taxa global.");
        return;
      }

      setGlobalFeeInput(data.settings.globalPlatformFeePercent.toFixed(2));
      setSettingsMessage("Taxa global salva. A alteração vale para novas ordens.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Não foi possível salvar a taxa global.");
    } finally {
      setSavingSettings(false);
    }
  }

  const chartColumnsClass =
    chartScope === "weekly"
        ? "grid-cols-7"
        : chartScope === "monthly"
          ? "grid-cols-15 sm:grid-cols-31"
          : "grid-cols-12";

  return (
    <div className="min-h-screen bg-[#0F1117] text-white" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6 xl:col-span-2">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 xl:col-span-2">
                Período do dashboard
                <select
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={range}
                  onChange={(event) => setRange(event.target.value as RangeValue)}
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="all">Todo período</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Status
                <select
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Jogo
                <select
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={gameFilter}
                  onChange={(event) => setGameFilter(event.target.value)}
                >
                  {gameOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Pagamento
                <select
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                >
                  {paymentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Admin</p>
                <h1 className="max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl">Dashboard Financeiro</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                  Painel calculado direto dos pedidos registrados em <span className="font-semibold text-cyan-300">order-checkouts</span>, com repasse,
                  lucro e atalhos rápidos para ajustar as taxas do site.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/taxas"
                  className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20"
                >
                  Taxas do site
                </Link>
                <Link
                  href="/admin/clientes/agentes"
                  className="inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:border-fuchsia-400 hover:bg-fuchsia-500/20"
                >
                  Taxas dos agentes
                </Link>
                <Link
                  href="/admin/clientes/todos"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  Clientes
                </Link>
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  Pedidos
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Pedidos filtrados</p>
                <p className="mt-2 text-3xl font-black text-white">{totalOrders}</p>
                <p className="mt-1 text-xs text-slate-500">{paidOrders} pagos / {statusBreakdown.length} status</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Faturamento bruto</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">{formatMoney(totalRevenue)}</p>
                <p className="mt-1 text-xs text-slate-500">Base dos pedidos selecionados</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Repasse total</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{formatMoney(totalPayout)}</p>
                <p className="mt-1 text-xs text-slate-500">Valor para fornecedores</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Lucro da plataforma</p>
                <p className="mt-2 text-3xl font-black text-fuchsia-300">{formatMoney(totalPlatformProfit)}</p>
                <p className="mt-1 text-xs text-slate-500">Média de {formatPercent(averageCommissionPercent)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Ticket médio</p>
                <p className="mt-2 text-2xl font-black text-white">{formatMoney(avgTicket)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pedidos completos</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">{statusBreakdown.find((item) => item.label === "Completed")?.count ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pedidos pagos</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{paidOrders}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Taxa média</p>
                <p className="mt-2 text-2xl font-black text-fuchsia-300">{formatPercent(averageCommissionPercent)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Mix financeiro</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Repasse x lucro</h2>
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                Dados reais
              </span>
            </div>

            <div className="mt-6 flex items-center gap-5">
              <div
                className="relative h-44 w-44 shrink-0 rounded-full border border-white/10"
                style={{
                  background:
                    totalRevenue > 0
                      ? `conic-gradient(from 180deg, rgba(52,211,153,0.95) 0% ${Math.max(0, (totalPayout / totalRevenue) * 100)}%, rgba(34,211,238,0.95) ${Math.max(0, (totalPayout / totalRevenue) * 100)}% 100%)`
                      : "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
                }}
              >
                <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border border-white/10 bg-black/95 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Lucro</span>
                  <span className="mt-1 text-lg font-black text-white">{formatPercent(averageCommissionPercent)}</span>
                  <span className="mt-1 text-[10px] font-semibold text-slate-500">da receita total</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                {taxSegments.map((segment) => (
                  <div key={segment.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-300">{segment.label}</span>
                      <span className="tabular-nums text-slate-500">{formatMoney(segment.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${segment.color}`}
                        style={{ width: `${Math.max(6, Math.round((segment.value / taxTotalMax) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Configurações</p>
              <p className="mt-1 text-sm text-slate-400">Taxa global aplicada em novas ordens da plataforma.</p>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Taxa global do site (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={globalFeeInput}
                    onChange={(event) => setGlobalFeeInput(event.target.value)}
                    className="min-h-[44px] w-48 rounded-xl border border-white/10 bg-black/50 px-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void saveGlobalSiteFee()}
                  disabled={savingSettings}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSettings ? "Salvando..." : "Salvar taxa global"}
                </button>
              </div>

              {settingsMessage ? <p className="mt-3 text-xs font-semibold text-emerald-300">{settingsMessage}</p> : null}
              {settingsError ? <p className="mt-3 text-xs font-semibold text-rose-300">{settingsError}</p> : null}
            </div>
          </article>
        </section>

        {loadError ? (
          <section className="mt-5 rounded-[1.6rem] border border-red-500/20 bg-red-500/10 p-5 text-sm font-semibold text-red-200">
            {loadError}
          </section>
        ) : null}

        {totalOrders === 0 ? (
          <section className="mt-5 rounded-[1.8rem] border border-white/10 bg-[#171A22] p-6 text-sm font-semibold text-slate-400">
            Nenhum pedido encontrado para os filtros selecionados.
          </section>
        ) : (
          <>
            <section className="mt-5">
              <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Receita</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Faturamento por período</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Semanal", value: "weekly" as const },
                      { label: "Mensal", value: "monthly" as const },
                      { label: "Anual", value: "yearly" as const },
                    ].map((scopeOption) => (
                      <button
                        key={scopeOption.value}
                        type="button"
                        onClick={() => setChartScope(scopeOption.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] transition ${
                          chartScope === scopeOption.value
                            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        {scopeOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Receita</p>
                    <p className="mt-1 text-sm font-semibold text-white">{formatMoney(chartTotalRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Média por período</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-300">{formatMoney(chartAverageRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total de pedidos</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">{chartTotalOrders}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto pb-1">
                  <div className="relative min-w-[960px]">
                    <div className="relative h-80 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
                      {chartReferenceLines.map((line) => (
                        <div
                          key={`${line.value}-${line.positionPercent}`}
                          className="pointer-events-none absolute left-4 right-4"
                          style={{ bottom: `calc(${line.positionPercent}% + 38px)` }}
                        >
                          <div className="relative border-t border-dashed border-white/10">
                            <span className="absolute -top-2 -left-2 -translate-x-full rounded bg-[#0F1117] px-1 text-[10px] font-semibold text-slate-500">
                              {formatMoney(line.value)}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className={`absolute inset-x-4 bottom-5 top-8 grid items-end gap-1 ${chartColumnsClass}`}>
                        {currentBuckets.map((bucket) => {
                          const ratio = bucket.revenueCents > 0 ? bucket.revenueCents / chartMaxValue : 0;
                          const heightPercent = ratio * 84;
                          const isHovered = hoveredBarKey === bucket.key;
                          const showValue = chartScope === "weekly" || chartScope === "yearly" || isHovered;
                          const averageTicket = bucket.ordersCount > 0 ? Math.round(bucket.revenueCents / bucket.ordersCount) : 0;

                          return (
                            <div
                              key={bucket.key}
                              className="group relative flex h-full flex-col items-center justify-end"
                              onMouseEnter={() => setHoveredBarKey(bucket.key)}
                              onMouseLeave={() => setHoveredBarKey(null)}
                            >
                              <div className="relative flex h-full w-full items-end pb-6">
                                <div className="relative h-full w-full">
                                  <div className="absolute inset-0 overflow-hidden rounded-md bg-slate-800/60">
                                    {bucket.revenueCents > 0 ? (
                                      <div
                                        className={`absolute bottom-0 left-0 right-0 rounded-md bg-[linear-gradient(180deg,#22d3ee_0%,#34d399_56%,#86efac_100%)] transition-all duration-500 ease-out ${
                                          isHovered ? "brightness-110 shadow-[0_0_14px_rgba(52,211,153,0.35)]" : "shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                                        }`}
                                        style={{
                                          height: chartAnimated ? `${heightPercent}%` : "0%",
                                        }}
                                      />
                                    ) : null}
                                  </div>

                                  {bucket.revenueCents > 0 && showValue ? (
                                    <p
                                      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-md bg-[#0F1117]/90 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200"
                                      style={{ bottom: `calc(${heightPercent}% + 8px)` }}
                                    >
                                      {formatMoney(bucket.revenueCents)}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#11141C] px-3 py-2 text-xs text-slate-200 shadow-[0_14px_30px_rgba(0,0,0,0.45)] group-hover:block">
                                  <p className="font-semibold text-white">{bucket.fullLabel}</p>
                                  <p className="mt-1 text-slate-300">Receita: <span className="font-semibold text-cyan-300">{formatMoney(bucket.revenueCents)}</span></p>
                                  <p className="mt-1 text-slate-300">Pedidos: <span className="font-semibold text-emerald-300">{bucket.ordersCount}</span></p>
                                  <p className="mt-1 text-slate-300">Ticket Médio: <span className="font-semibold text-fuchsia-300">{formatMoney(averageTicket)}</span></p>
                                </div>
                              </div>

                              <p className="-mt-1 text-[10px] font-semibold text-slate-400">{bucket.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Receita Total</p>
                    <p className="mt-1 text-lg font-black text-cyan-300">{formatMoney(chartTotalRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Ticket Médio</p>
                    <p className="mt-1 text-lg font-black text-emerald-300">{formatMoney(chartTicketAverage)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Melhor período</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {chartBestBucket ? `${chartBestBucket.label} - ${formatMoney(chartBestBucket.revenueCents)}` : "Sem vendas"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Pior período</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {chartWorstBucket ? `${chartWorstBucket.label} - ${formatMoney(chartWorstBucket.revenueCents)}` : "Sem vendas"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Crescimento vs período anterior</p>
                    <p className={`mt-1 text-lg font-black ${growthPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {growthPercent >= 0 ? "+" : ""}
                      {growthPercent.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Anterior: {formatMoney(previousRevenue)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Mix de pagamento</p>
                  <div className="mt-4 space-y-3">
                    {paymentMix.map((item) => (
                      <div key={item.method} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">{item.method}</span>
                          <span className="text-slate-500">{item.count} pedidos</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,#a78bfa,#22d3ee)]"
                            style={{ width: `${Math.max(6, Math.round((item.value / Math.max(totalRevenue, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Top jogos</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Valor por jogo</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {gameRevenue.map((item) => {
                    const widthPct = Math.max(6, Math.round((item.value / topGameMax) * 100));

                    return (
                      <div key={item.game} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">{item.game}</span>
                          <span className="text-slate-500">{formatMoney(item.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5">
                          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#34d399,#86efac)]" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Recentes</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Pedidos recentes</h2>
                  </div>
                  <Link href="/admin/orders" className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:text-cyan-200">
                    Ver todos
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-white/20 hover:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{order.gameTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.nickname} · {formatDateTime(order.createdUnix)}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-600">{order.statusLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-cyan-300">{formatMoney(order.amountTotal)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{order.paymentMethod}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
