"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
};

type RangeValue = "7" | "30" | "90" | "all";

function formatMoney(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDateLabel(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatDateTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("pt-BR");
}

function getRangeStartMs(range: RangeValue): number | null {
  if (range === "all") return null;
  const days = Number(range);
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function DashboardClient({ orders, loadError }: DashboardClientProps) {
  const [range, setRange] = useState<RangeValue>("30");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const statusOptions = useMemo(() => {
    const unique = new Set(orders.map((order) => order.statusLabel));
    return ["all", ...Array.from(unique)];
  }, [orders]);

  const gameOptions = useMemo(() => {
    const unique = new Set(orders.map((order) => order.gameTitle));
    return ["all", ...Array.from(unique)];
  }, [orders]);

  const paymentOptions = useMemo(() => {
    const unique = new Set(orders.map((order) => order.paymentMethod));
    return ["all", ...Array.from(unique)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const rangeStart = getRangeStartMs(range);

    return orders.filter((order) => {
      const createdMs = order.createdUnix * 1000;

      if (rangeStart && createdMs < rangeStart) return false;
      if (statusFilter !== "all" && order.statusLabel !== statusFilter) return false;
      if (gameFilter !== "all" && order.gameTitle !== gameFilter) return false;
      if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter) return false;
      return true;
    });
  }, [orders, range, statusFilter, gameFilter, paymentFilter]);

  const totalRevenue = filteredOrders.reduce((acc, order) => acc + order.amountTotal, 0);
  const totalPayout = filteredOrders.reduce((acc, order) => acc + order.sellerAmountCents, 0);
  const totalPlatformProfit = filteredOrders.reduce((acc, order) => acc + order.platformProfitCents, 0);
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter((order) => {
    const label = order.statusLabel.toLowerCase();
    return label === "paid" || label === "pago" || label === "completed" || label === "concluido";
  }).length;
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const averageCommissionPercent = totalRevenue > 0 ? (totalPlatformProfit / totalRevenue) * 100 : 0;

  const revenueByDay = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const order of filteredOrders) {
      const date = new Date(order.createdUnix * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      grouped.set(key, (grouped.get(key) || 0) + order.amountTotal);
    }

    const points = Array.from(grouped.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([dayKey, value]) => ({
        dayKey,
        label: formatDateLabel(new Date(`${dayKey}T00:00:00`).getTime() / 1000),
        value,
      }));

    const maxValue = Math.max(...points.map((point) => point.value), 1);

    return { points, maxValue };
  }, [filteredOrders]);

  const statusBreakdown = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const order of filteredOrders) {
      grouped.set(order.statusLabel, (grouped.get(order.statusLabel) || 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({
        label,
        count,
        pct: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders, totalOrders]);

  const gameRevenue = (() => {
    const grouped = new Map<string, number>();

    for (const order of filteredOrders) {
      grouped.set(order.gameTitle, (grouped.get(order.gameTitle) || 0) + order.amountTotal);
    }

    return Array.from(grouped.entries())
      .map(([game, value]) => ({ game, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  const topGameMax = Math.max(...gameRevenue.map((item) => item.value), 1);

  const paymentMix = (() => {
    const grouped = new Map<string, { count: number; value: number }>();

    for (const order of filteredOrders) {
      const key = order.paymentMethod || "--";
      const current = grouped.get(key) ?? { count: 0, value: 0 };
      grouped.set(key, { count: current.count + 1, value: current.value + order.amountTotal });
    }

    return Array.from(grouped.entries())
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.value - a.value);
  })();

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

  const recentOrders = [...filteredOrders].sort((a, b) => b.createdUnix - a.createdUnix).slice(0, 8);

  return (
    <div className="min-h-screen bg-black text-green-400" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-8">
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

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-8">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Últimos 7 dias", value: "7" as const },
                { label: "Últimos 30 dias", value: "30" as const },
                { label: "Últimos 90 dias", value: "90" as const },
              ].map((button) => (
                <button
                  key={button.value}
                  type="button"
                  onClick={() => setRange(button.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    range === button.value
                      ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-black/30 text-slate-300 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">{button.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Troca a leitura do painel</p>
                </button>
              ))}
            </div>
          </article>
        </section>

        {loadError ? (
          <section className="mt-5 rounded-[1.6rem] border border-red-500/20 bg-red-500/10 p-5 text-sm font-semibold text-red-200">
            {loadError}
          </section>
        ) : null}

        <section className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Período
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
        </section>

        {totalOrders === 0 ? (
          <section className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 text-sm font-semibold text-slate-400">
            Nenhum pedido encontrado para os filtros selecionados.
          </section>
        ) : (
          <>
            <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Receita</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Faturamento por dia</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                    {revenueByDay.points.length} pontos
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2 sm:grid-cols-14">
                  {revenueByDay.points.map((point) => {
                    const heightPct = Math.max(8, Math.round((point.value / revenueByDay.maxValue) * 100));

                    return (
                      <div key={point.dayKey} className="flex flex-col items-center justify-end gap-2">
                        <div className="flex h-40 w-full items-end">
                          <div
                            className="w-full rounded-t-md bg-[linear-gradient(180deg,#22d3ee_0%,#34d399_56%,#86efac_100%)]"
                            style={{ height: `${heightPct}%` }}
                            title={`${point.label} - ${formatMoney(point.value)}`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Operação</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Status e pagamento</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {statusBreakdown.map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{row.label}</span>
                        <span className="text-slate-500">{row.count} ({row.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5">
                        <div className="h-2 rounded-full bg-[linear-gradient(90deg,#22d3ee,#34d399)]" style={{ width: `${Math.max(4, row.pct)}%` }} />
                      </div>
                    </div>
                  ))}
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
              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
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

              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
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
