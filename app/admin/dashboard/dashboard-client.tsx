"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type DashboardOrder = {
  id: string;
  createdUnix: number;
  amountTotal: number;
  currency: string;
  statusLabel: string;
  gameTitle: string;
  categoryTitle: string;
  paymentMethod: string;
  paymentGateway: string;
  paymentProvider: string;
  country: string;
  countryCode: string;
  nickname: string;
  email: string;
  supplierName: string;
  supplierPercentage: number;
  supplierPayout: number;
  grossProfit: number;
  cardFee: number;
  cashback: number;
  operationalReserve: number;
  netProfit: number;
};

type DashboardClientProps = {
  orders: DashboardOrder[];
  loadError: string | null;
};

type RangeValue = "7" | "30" | "90" | "all" | "custom";
type ChartScope = "monthly" | "yearly";
type DashboardCurrency = "BRL" | "USD" | "EUR";
type CurrencyRates = {
  usdToBrl: number;
  usdToEur: number;
};

type RevenueBucket = {
  key: string;
  label: string;
  fullLabel: string;
  startMs: number;
  endMs: number;
  revenueCents: number;
  ordersCount: number;
};

const FALLBACK_RATES: CurrencyRates = {
  usdToBrl: 5.5,
  usdToEur: 0.92,
};

function normalizeCurrency(value: string | null | undefined): DashboardCurrency {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "BRL" || normalized === "EUR") {
    return normalized;
  }

  return "USD";
}

function resolveGatewayLabel(paymentMethod: string) {
  const normalized = paymentMethod.trim().toLowerCase();

  if (!normalized || normalized === "--") return "Gateway";
  if (normalized.includes("mercado")) return "Gateway Mercado Pago";
  if (normalized.includes("stripe") || normalized.includes("card") || normalized.includes("cartao")) return "Gateway Stripe";
  if (normalized.includes("pix")) return "Gateway";
  return `Gateway ${paymentMethod}`;
}

function formatMoney(amountInCents: number, currency: DashboardCurrency) {
  const locale = currency === "BRL" ? "pt-BR" : currency === "EUR" ? "de-DE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

function formatDeduction(amountInCents: number, currency: DashboardCurrency) {
  return `-${formatMoney(Math.abs(amountInCents), currency)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDateTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("pt-BR");
}

function formatDateInputFromMs(ms: number) {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateStartMs(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDateEndMs(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getRangeStartMs(range: RangeValue): number | null {
  if (range === "all" || range === "custom") return null;
  const days = Number(range);
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function startOfMonth(ms: number) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
}

function startOfYear(ms: number) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePeriodAnchorMs(scope: ChartScope, inputMs: number, nowMs: number) {
  const clampedMs = Math.min(inputMs, nowMs);

  if (scope === "monthly") return startOfMonth(clampedMs);
  return startOfYear(clampedMs);
}

function shiftPeriodAnchorMs(scope: ChartScope, anchorMs: number, step: number, nowMs: number) {
  const date = new Date(anchorMs);

  if (scope === "monthly") {
    date.setMonth(date.getMonth() + step);
  } else {
    date.setFullYear(date.getFullYear() + step);
  }

  return normalizePeriodAnchorMs(scope, date.getTime(), nowMs);
}

function formatPeriodLabel(scope: ChartScope, anchorMs: number) {
  const anchorDate = new Date(anchorMs);

  if (scope === "monthly") {
    return capitalize(
      anchorDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    );
  }

  return String(anchorDate.getFullYear());
}

function getScopeUnitLabel(scope: ChartScope) {
  if (scope === "monthly") return "dia";
  return "mês";
}

function buildPeriodBuckets(scope: ChartScope, anchorMs: number): RevenueBucket[] {
  const buckets: RevenueBucket[] = [];
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  if (scope === "monthly") {
    const periodStart = startOfMonth(anchorMs);
    const date = new Date(periodStart);
    const year = date.getFullYear();
    const month = date.getMonth();
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

  const yearStart = startOfYear(anchorMs);
  const year = new Date(yearStart).getFullYear();

  for (let month = 0; month < 12; month += 1) {
    const startMs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();

    buckets.push({
      key: `${year}-${month + 1}`,
      label: monthLabels[month],
      fullLabel: capitalize(
        new Date(startMs).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
      ),
      startMs,
      endMs,
      revenueCents: 0,
      ordersCount: 0,
    });
  }

  return buckets;
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

function roundUpToNiceScale(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 100;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const residual = value / magnitude;
  const candidates = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
  const selected = candidates.find((candidate) => residual <= candidate) ?? 10;

  return selected * magnitude;
}

function buildChartScale(maxRevenueCents: number) {
  const safeMaxCents = Math.max(maxRevenueCents, 0);
  const safeMaxUsd = safeMaxCents / 100;
  const desiredIntervals = 5;
  const scaleMaxUsd = roundUpToNiceScale(safeMaxUsd);
  const stepUsd = scaleMaxUsd / desiredIntervals;
  const scaleMaxCents = Math.round(scaleMaxUsd * 100);

  const ticks = Array.from({ length: desiredIntervals + 1 }, (_, index) => {
    const tickUsd = scaleMaxUsd - index * stepUsd;
    return Math.max(0, Math.round(tickUsd * 100));
  });

  return {
    max: scaleMaxCents,
    ticks,
  };
}

function buildReferenceLines(scaleMaxValue: number, ticks: number[]) {
  const safeMax = Math.max(scaleMaxValue, 1);

  return ticks.map((value) => {
    const positionPercent = (value / safeMax) * 100;

    return {
      value,
      positionPercent,
    };
  });
}

function convertAmountCents(
  amountInCents: number,
  fromCurrency: DashboardCurrency,
  toCurrency: DashboardCurrency,
  rates: CurrencyRates,
) {
  if (fromCurrency === toCurrency) {
    return amountInCents;
  }

  const amount = amountInCents / 100;
  const usdAmount =
    fromCurrency === "USD"
      ? amount
      : fromCurrency === "BRL"
        ? amount / rates.usdToBrl
        : amount / rates.usdToEur;

  const convertedAmount =
    toCurrency === "USD"
      ? usdAmount
      : toCurrency === "BRL"
        ? usdAmount * rates.usdToBrl
        : usdAmount * rates.usdToEur;

  return Math.round(convertedAmount * 100);
}

export function DashboardClient({
  orders,
  loadError,
}: DashboardClientProps) {
  const initialNowMs = Date.now();
  const initialRangeEndDate = formatDateInputFromMs(initialNowMs);
  const initialRangeStartDate = formatDateInputFromMs(initialNowMs - 29 * 24 * 60 * 60 * 1000);
  const [range, setRange] = useState<RangeValue>("30");
  const [customRangeStartDate, setCustomRangeStartDate] = useState(initialRangeStartDate);
  const [customRangeEndDate, setCustomRangeEndDate] = useState(initialRangeEndDate);
  const [chartScope, setChartScope] = useState<ChartScope>("monthly");
  const [chartAnchorMs, setChartAnchorMs] = useState(() => normalizePeriodAnchorMs("monthly", initialNowMs, initialNowMs));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [displayCurrency, setDisplayCurrency] = useState<DashboardCurrency>("BRL");
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates>(FALLBACK_RATES);
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);
  const [chartAnimated, setChartAnimated] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadRates = async () => {
      try {
        const response = await fetch("/api/fx/usd-rates", { cache: "no-store" });
        const payload = (await response.json()) as Partial<CurrencyRates>;

        if (ignore) {
          return;
        }

        if (
          typeof payload.usdToBrl === "number" &&
          Number.isFinite(payload.usdToBrl) &&
          payload.usdToBrl > 0 &&
          typeof payload.usdToEur === "number" &&
          Number.isFinite(payload.usdToEur) &&
          payload.usdToEur > 0
        ) {
          setCurrencyRates({
            usdToBrl: payload.usdToBrl,
            usdToEur: payload.usdToEur,
          });
        }
      } catch {
        if (!ignore) {
          setCurrencyRates(FALLBACK_RATES);
        }
      }
    };

    void loadRates();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setChartAnimated(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setChartAnimated(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [chartScope, chartAnchorMs, range, customRangeStartDate, customRangeEndDate, statusFilter, gameFilter, paymentFilter]);

  useEffect(() => {
    const nowMs = Date.now();
    setChartAnchorMs((current) => normalizePeriodAnchorMs(chartScope, current, nowMs));
  }, [chartScope]);

  useEffect(() => {
    if (chartScope !== "monthly") {
      setMonthPickerOpen(false);
    }
  }, [chartScope]);

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
  const customStartMs = parseDateStartMs(customRangeStartDate);
  const customEndMs = parseDateEndMs(customRangeEndDate);
  const customBounds =
    range === "custom" && customStartMs !== null && customEndMs !== null
      ? {
          startMs: Math.min(customStartMs, customEndMs),
          endMs: Math.max(customStartMs, customEndMs),
        }
      : null;

  const dashboardFilteredOrders = baseFilteredOrders.filter((order) => {
    const createdMs = order.createdUnix * 1000;

    if (customBounds) {
      return createdMs >= customBounds.startMs && createdMs <= customBounds.endMs;
    }

    return rangeStart ? createdMs >= rangeStart : true;
  });

  const displayOrders = dashboardFilteredOrders.map((order) => {
    const orderCurrency = normalizeCurrency(order.currency);

    return {
      ...order,
      amountTotal: convertAmountCents(order.amountTotal, orderCurrency, displayCurrency, currencyRates),
      supplierPayout: convertAmountCents(order.supplierPayout, orderCurrency, displayCurrency, currencyRates),
      grossProfit: convertAmountCents(order.grossProfit, orderCurrency, displayCurrency, currencyRates),
      cardFee: convertAmountCents(order.cardFee, orderCurrency, displayCurrency, currencyRates),
      cashback: convertAmountCents(order.cashback, orderCurrency, displayCurrency, currencyRates),
      operationalReserve: convertAmountCents(order.operationalReserve, orderCurrency, displayCurrency, currencyRates),
      netProfit: convertAmountCents(order.netProfit, orderCurrency, displayCurrency, currencyRates),
      currency: displayCurrency,
    } satisfies DashboardOrder;
  });

  const revenueByCurrency = dashboardFilteredOrders.reduce<Record<DashboardCurrency, number>>(
    (acc, order) => {
      const orderCurrency = normalizeCurrency(order.currency);
      acc[orderCurrency] += order.amountTotal;
      return acc;
    },
    {
      BRL: 0,
      USD: 0,
      EUR: 0,
    },
  );

  const nowMs = Date.now();
  const totalRevenue = displayOrders.reduce((acc, order) => acc + order.amountTotal, 0);
  const totalPayout = displayOrders.reduce((acc, order) => acc + order.supplierPayout, 0);
  const totalGatewayFee = displayOrders.reduce((acc, order) => acc + order.cardFee, 0);
  const totalCashback = displayOrders.reduce((acc, order) => acc + order.cashback, 0);
  const totalOperationalReserve = displayOrders.reduce((acc, order) => acc + order.operationalReserve, 0);
  const totalGrossProfit = displayOrders.reduce((acc, order) => acc + order.grossProfit, 0);
  const orderNetProfit = displayOrders.reduce((acc, order) => acc + order.netProfit, 0);
  const totalOrders = displayOrders.length;
  const totalNetProfit = orderNetProfit;
  const gatewayMethods = Array.from(new Set(displayOrders.map((order) => resolveGatewayLabel(order.paymentMethod))));
  const gatewayLabel = gatewayMethods.length === 1 ? gatewayMethods[0] : "Gateway (misto)";

  const paidOrders = displayOrders.filter((order) => {
    const label = order.statusLabel.toLowerCase();
    return label === "paid" || label === "pago" || label === "completed" || label === "concluido";
  }).length;
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const statusGrouped = new Map<string, number>();
  for (const order of displayOrders) {
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
  for (const order of displayOrders) {
    gameRevenueGrouped.set(order.gameTitle, (gameRevenueGrouped.get(order.gameTitle) || 0) + order.amountTotal);
  }

  const gameRevenue = Array.from(gameRevenueGrouped.entries())
    .map(([game, value]) => ({ game, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topGameMax = Math.max(...gameRevenue.map((item) => item.value), 1);

  const paymentMixGrouped = new Map<string, { count: number; value: number }>();
  for (const order of displayOrders) {
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

  const recentOrders = [...displayOrders].sort((a, b) => b.createdUnix - a.createdUnix).slice(0, 8);

  const normalizedCurrentAnchor = normalizePeriodAnchorMs(chartScope, nowMs, nowMs);
  const canNavigateNext = chartAnchorMs < normalizedCurrentAnchor;
  const currentBuckets = fillBucketsWithOrders(buildPeriodBuckets(chartScope, chartAnchorMs), displayOrders);
  const previousAnchorMs = shiftPeriodAnchorMs(chartScope, chartAnchorMs, -1, nowMs);
  const previousBuckets = fillBucketsWithOrders(buildPeriodBuckets(chartScope, previousAnchorMs), displayOrders);
  const chartPeriodLabel = formatPeriodLabel(chartScope, chartAnchorMs);
  const periodUnitLabel = getScopeUnitLabel(chartScope);
  const periodAverageLabel = `Média por ${periodUnitLabel}`;
  const bestPeriodLabel = chartScope === "yearly" ? "Melhor mês" : "Melhor período";
  const worstPeriodLabel = chartScope === "yearly" ? "Pior mês" : "Pior período";

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const orderYears = Array.from(new Set(displayOrders.map((order) => new Date(order.createdUnix * 1000).getFullYear())));
  if (!orderYears.includes(new Date(nowMs).getFullYear())) {
    orderYears.push(new Date(nowMs).getFullYear());
  }
  const availableYears = orderYears.sort((a, b) => b - a);
  const selectedMonth = new Date(chartAnchorMs).getMonth();
  const selectedYear = new Date(chartAnchorMs).getFullYear();
  const chartGridTemplateColumns = `repeat(${Math.max(currentBuckets.length, 1)}, minmax(0, 1fr))`;
  const chartMinWidth = Math.max(960, currentBuckets.length * 38);
  const chartYAxisGutterPx = 64;
  const chartPlotTopPx = 94;
  const chartPlotBottomPx = 42;

  const chartMaxValue = Math.max(...currentBuckets.map((bucket) => bucket.revenueCents), 0);
  const chartScale = buildChartScale(chartMaxValue);
  const chartScaleMax = chartScale.max;
  const chartReferenceLines = buildReferenceLines(chartScaleMax, chartScale.ticks);
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

  function navigatePeriod(step: number) {
    setHoveredBarKey(null);
    setChartAnchorMs((current) => shiftPeriodAnchorMs(chartScope, current, step, Date.now()));
  }

  function drillDownToMonthly(bucketStartMs: number) {
    if (chartScope !== "yearly") {
      return;
    }

    const now = Date.now();
    setHoveredBarKey(null);
    setMonthPickerOpen(false);
    setChartAnchorMs(normalizePeriodAnchorMs("monthly", bucketStartMs, now));
    setChartScope("monthly");
  }

  function applyMonthlyYear(year: number) {
    const anchor = new Date(chartAnchorMs);
    const target = new Date(year, anchor.getMonth(), 1, 12, 0, 0, 0).getTime();
    const now = Date.now();
    setChartAnchorMs(normalizePeriodAnchorMs("monthly", target, now));
  }

  function applyMonthlyMonth(monthIndex: number) {
    const anchor = new Date(chartAnchorMs);
    const target = new Date(anchor.getFullYear(), monthIndex, 1, 12, 0, 0, 0).getTime();
    const now = Date.now();
    setChartAnchorMs(normalizePeriodAnchorMs("monthly", target, now));
    setMonthPickerOpen(false);
  }


  return (
    <div className="min-h-screen bg-[#0F1117] text-white">
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-[#171A22] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6 xl:col-span-2">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 xl:col-span-2">
                Período do dashboard
                <select
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={range}
                  onChange={(event) => setRange(event.target.value as RangeValue)}
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="all">Todo período</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </label>

              {range === "custom" ? (
                <>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Início
                    <input
                      type="date"
                      value={customRangeStartDate}
                      onChange={(event) => setCustomRangeStartDate(event.target.value)}
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Fim
                    <input
                      type="date"
                      value={customRangeEndDate}
                      onChange={(event) => setCustomRangeEndDate(event.target.value)}
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                </>
              ) : null}

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Status
                <select
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
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
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
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
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
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

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Moeda
                <select
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                  value={displayCurrency}
                  onChange={(event) => setDisplayCurrency(event.target.value as DashboardCurrency)}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-400">
              Cotacao usada na conversao: 1 USD = {currencyRates.usdToBrl.toFixed(4)} BRL | 1 USD = {currencyRates.usdToEur.toFixed(4)} EUR
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
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Receita em BRL</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">{formatMoney(revenueByCurrency.BRL, "BRL")}</p>
                <p className="mt-1 text-xs text-slate-500">Valor direto das ordens em BRL</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Receita em USD</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{formatMoney(revenueByCurrency.USD, "USD")}</p>
                <p className="mt-1 text-xs text-slate-500">Valor direto das ordens em USD</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Receita em EUR</p>
                <p className="mt-2 text-3xl font-black text-fuchsia-300">{formatMoney(revenueByCurrency.EUR, "EUR")}</p>
                <p className="mt-1 text-xs text-slate-500">Valor direto das ordens em EUR</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Receita Total Convertido ({displayCurrency})</p>
                <p className="mt-2 text-3xl font-black text-white">{formatMoney(totalRevenue, displayCurrency)}</p>
                <p className="mt-1 text-xs text-slate-500">Convertida para a moeda selecionada</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Ticket médio</p>
                <p className="mt-2 text-2xl font-black text-white">{formatMoney(avgTicket, displayCurrency)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pedidos completos</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">{statusBreakdown.find((item) => item.label === "Completed")?.count ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pedidos filtrados</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{totalOrders}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">Configuracoes financeiras</p>
              <p className="mt-1 text-sm text-cyan-100/90">As edicoes de percentuais e custos operacionais ficam somente na Calculadora Financeira.</p>
              <Link
                href="/admin/calculadora-financeira"
                className="mt-3 inline-flex items-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20"
              >
                Abrir Calculadora Financeira
              </Link>
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

            <article className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Composição do Lucro</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-200">Faturamento Bruto</span>
                  <span className="font-black text-cyan-200">{formatMoney(totalRevenue, displayCurrency)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">- Repasse Fornecedor</span>
                  <span className="font-black text-rose-300">{formatDeduction(totalPayout, displayCurrency)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">- {gatewayLabel}</span>
                  <span className="font-black text-rose-300">{formatDeduction(totalGatewayFee, displayCurrency)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">- Cashback / Loot Coins</span>
                  <span className="font-black text-rose-300">{formatDeduction(totalCashback, displayCurrency)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">- Reserva Operacional</span>
                  <span className="font-black text-rose-300">{formatDeduction(totalOperationalReserve, displayCurrency)}</span>
                </div>

              </div>

              <div className="my-3 border-t border-dashed border-white/15" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Lucro Líquido</span>
                <span className="text-right text-xl font-black text-fuchsia-300">{formatMoney(totalNetProfit, displayCurrency)}</span>
              </div>
            </article>

            <article className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Repasse x Lucro</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">Receita</span>
                  <span className="font-semibold text-cyan-300">{formatMoney(totalRevenue, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">Fornecedor</span>
                  <span className="font-semibold text-rose-300">{formatDeduction(totalPayout, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">Gateway</span>
                  <span className="font-semibold text-rose-300">{formatDeduction(totalGatewayFee, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-300">Reserva Operacional</span>
                  <span className="font-semibold text-rose-300">{formatDeduction(totalOperationalReserve, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-black text-white">Lucro Líquido</span>
                  <span className="text-right font-black text-fuchsia-300">{formatMoney(totalNetProfit, displayCurrency)}</span>
                </div>
              </div>
            </article>
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Receita</p>
                    <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Faturamento por período</h2>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => navigatePeriod(-1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg text-white transition hover:border-cyan-400/60 hover:text-cyan-200"
                      aria-label="Período anterior"
                    >
                      ←
                    </button>
                    <span className="min-w-[190px] text-center text-sm font-bold text-white sm:min-w-[220px]">{chartPeriodLabel}</span>
                    <button
                      type="button"
                      onClick={() => navigatePeriod(1)}
                      disabled={!canNavigateNext}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg text-white transition hover:border-cyan-400/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Próximo período"
                    >
                      →
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
                      {[
                        { label: "Mensal", value: "monthly" as const },
                        { label: "Anual", value: "yearly" as const },
                      ].map((scopeOption) => (
                        <button
                          key={scopeOption.value}
                          type="button"
                          onClick={() => setChartScope(scopeOption.value)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ${
                            chartScope === scopeOption.value
                              ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                              : "border-transparent text-slate-300 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {scopeOption.label}
                        </button>
                      ))}
                    </div>

                    {chartScope === "monthly" ? (
                      <button
                        type="button"
                        onClick={() => setMonthPickerOpen((value) => !value)}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50"
                      >
                        <span className="text-sm text-white">📅</span>
                        {chartPeriodLabel}
                        <span className="text-[10px] text-slate-400">▼</span>
                      </button>
                    ) : null}

                  </div>
                </div>

                {chartScope === "monthly" && monthPickerOpen ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Selecionar mês</p>
                      <select
                        value={selectedYear}
                        onChange={(event) => applyMonthlyYear(Number(event.target.value))}
                        className="min-h-[36px] rounded-lg border border-white/10 bg-black/40 px-3 text-xs font-semibold text-white outline-none transition focus:border-cyan-400"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {monthNames.map((monthLabel, monthIndex) => (
                        <button
                          key={monthLabel}
                          type="button"
                          onClick={() => applyMonthlyMonth(monthIndex)}
                          className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                            selectedMonth === monthIndex
                              ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20"
                          }`}
                        >
                          {monthLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Receita</p>
                    <p className="mt-1 text-sm font-semibold text-white">{formatMoney(chartTotalRevenue, displayCurrency)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{periodAverageLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-300">{formatMoney(chartAverageRevenue, displayCurrency)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total de pedidos</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">{chartTotalOrders}</p>
                  </div>
                </div>

                {chartScope === "yearly" ? (
                  <p className="mt-3 text-xs font-semibold text-cyan-200/90">
                    Clique em um mês para abrir o gráfico mensal correspondente.
                  </p>
                ) : null}

                <div className="mt-4 overflow-x-auto pb-1">
                  <div className="relative" style={{ minWidth: `${chartMinWidth}px` }}>
                    <div className="relative h-80 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
                      <span className="pointer-events-none absolute left-2 top-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {displayCurrency}
                      </span>

                      {chartReferenceLines.map((line) => (
                        <div
                          key={`${line.value}-${line.positionPercent}`}
                          className="pointer-events-none absolute"
                          style={{
                            left: `${chartYAxisGutterPx}px`,
                            right: "16px",
                            bottom: `calc(${line.positionPercent}% + ${chartPlotBottomPx}px)`,
                          }}
                        >
                          <div className="relative border-t border-dashed border-white/10">
                            <span
                              className="absolute -top-2 rounded bg-[#0F1117] px-1 text-[10px] font-semibold text-slate-400"
                              style={{ left: `${-chartYAxisGutterPx + 6}px` }}
                            >
                              {formatMoney(line.value, displayCurrency)}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div
                        className="absolute grid items-end gap-1"
                        style={{
                          top: `${chartPlotTopPx}px`,
                          bottom: `${chartPlotBottomPx}px`,
                          left: `${chartYAxisGutterPx}px`,
                          right: "16px",
                          gridTemplateColumns: chartGridTemplateColumns,
                        }}
                      >
                        {currentBuckets.map((bucket) => {
                          const ratio = bucket.revenueCents > 0 ? bucket.revenueCents / chartScaleMax : 0;
                          const heightPercent = Math.max(0, Math.min(100, ratio * 100));
                          const tooltipBottomPercent = Math.min(heightPercent + 22, 76);
                          const canDrillDown = chartScope === "yearly";
                          const isHovered = hoveredBarKey === bucket.key;
                          const showValue = bucket.revenueCents > 0;
                          const averageTicket = bucket.ordersCount > 0 ? Math.round(bucket.revenueCents / bucket.ordersCount) : 0;

                          return (
                            <div
                              key={bucket.key}
                              className={`group relative flex h-full flex-col items-center justify-end ${
                                canDrillDown ? "cursor-pointer" : "cursor-default"
                              }`}
                              onMouseEnter={() => setHoveredBarKey(bucket.key)}
                              onMouseLeave={() => setHoveredBarKey(null)}
                              onClick={() => {
                                if (canDrillDown) {
                                  drillDownToMonthly(bucket.startMs);
                                }
                              }}
                              role={canDrillDown ? "button" : undefined}
                              tabIndex={canDrillDown ? 0 : undefined}
                              onKeyDown={(event) => {
                                if (!canDrillDown) return;
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  drillDownToMonthly(bucket.startMs);
                                }
                              }}
                            >
                              <div className="relative flex h-full w-full items-end">
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
                                      {formatMoney(bucket.revenueCents, displayCurrency)}
                                    </p>
                                  ) : null}
                                </div>

                                <div
                                  className="pointer-events-none absolute left-1/2 z-20 hidden w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#11141C] px-3 py-2 text-xs text-slate-200 shadow-[0_14px_30px_rgba(0,0,0,0.45)] group-hover:block"
                                  style={{ bottom: `calc(${tooltipBottomPercent}% + 18px)` }}
                                >
                                  <p className="font-semibold text-white">{bucket.fullLabel}</p>
                                  <p className="mt-1 text-slate-300">Receita: <span className="font-semibold text-cyan-300">{formatMoney(bucket.revenueCents, displayCurrency)}</span></p>
                                  <p className="mt-1 text-slate-300">Pedidos: <span className="font-semibold text-emerald-300">{bucket.ordersCount}</span></p>
                                  <p className="mt-1 text-slate-300">Ticket Médio: <span className="font-semibold text-fuchsia-300">{formatMoney(averageTicket, displayCurrency)}</span></p>
                                </div>
                              </div>

                              <p className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-400">
                                {bucket.label}
                              </p>
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
                    <p className="mt-1 text-lg font-black text-cyan-300">{formatMoney(chartTotalRevenue, displayCurrency)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Ticket Médio</p>
                    <p className="mt-1 text-lg font-black text-emerald-300">{formatMoney(chartTicketAverage, displayCurrency)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{bestPeriodLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {chartBestBucket ? `${chartBestBucket.label} - ${formatMoney(chartBestBucket.revenueCents, displayCurrency)}` : "Sem vendas"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{worstPeriodLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {chartWorstBucket ? `${chartWorstBucket.label} - ${formatMoney(chartWorstBucket.revenueCents, displayCurrency)}` : "Sem vendas"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Crescimento vs período anterior</p>
                    <p className={`mt-1 text-lg font-black ${growthPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {growthPercent >= 0 ? "+" : ""}
                      {growthPercent.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Anterior: {formatMoney(previousRevenue, displayCurrency)}</p>
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
                          <span className="text-slate-500">{formatMoney(item.value, displayCurrency)}</span>
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
                        <p className="text-sm font-black text-cyan-300">{formatMoney(order.amountTotal, displayCurrency)}</p>
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
