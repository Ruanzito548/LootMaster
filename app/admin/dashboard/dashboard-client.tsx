"use client";

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
};

type DashboardClientProps = {
  orders: DashboardOrder[];
  loadError: string | null;
};

type RangeValue = "7" | "30" | "90" | "all";

function formatMoney(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: (currency || "brl").toUpperCase(),
  }).format(amountInCents / 100);
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

  const currency = filteredOrders[0]?.currency || orders[0]?.currency || "brl";

  const totalRevenue = filteredOrders.reduce((acc, order) => acc + order.amountTotal, 0);
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter((order) => order.statusLabel === "Pago").length;
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

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

    const rows = Array.from(grouped.entries())
      .map(([label, count]) => ({
        label,
        count,
        pct: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return rows;
  }, [filteredOrders, totalOrders]);

  const gameRevenue = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const order of filteredOrders) {
      grouped.set(order.gameTitle, (grouped.get(order.gameTitle) || 0) + order.amountTotal);
    }

    return Array.from(grouped.entries())
      .map(([game, value]) => ({ game, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredOrders]);

  const topGameMax = Math.max(...gameRevenue.map((item) => item.value), 1);

  const recentOrders = useMemo(
    () => [...filteredOrders].sort((a, b) => b.createdUnix - a.createdUnix).slice(0, 8),
    [filteredOrders],
  );

  return (
    <div className="space-y-6">
      <section className="loot-panel rounded-[1.6rem] p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8aa1c3]">
            Periodo
            <select
              className="loot-select rounded-xl px-3 py-2 text-sm"
              value={range}
              onChange={(event) => setRange(event.target.value as RangeValue)}
            >
              <option value="7">Ultimos 7 dias</option>
              <option value="30">Ultimos 30 dias</option>
              <option value="90">Ultimos 90 dias</option>
              <option value="all">Todo periodo</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8aa1c3]">
            Status
            <select
              className="loot-select rounded-xl px-3 py-2 text-sm"
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

          <label className="space-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8aa1c3]">
            Jogo
            <select
              className="loot-select rounded-xl px-3 py-2 text-sm"
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

          <label className="space-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8aa1c3]">
            Pagamento
            <select
              className="loot-select rounded-xl px-3 py-2 text-sm"
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

      {loadError ? (
        <section className="loot-panel rounded-[1.6rem] p-6">
          <p className="text-sm font-semibold text-[#ffb0b0]">{loadError}</p>
        </section>
      ) : totalOrders === 0 ? (
        <section className="loot-panel rounded-[1.6rem] p-6">
          <p className="text-sm font-semibold text-[#9fb4d3]">Nenhum pedido encontrado para os filtros selecionados.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="loot-panel rounded-[1.2rem] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7e99bf]">Faturamento</p>
              <p className="mt-2 text-3xl font-black text-[#ffcf57]">{formatMoney(totalRevenue, currency)}</p>
            </article>
            <article className="loot-panel rounded-[1.2rem] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7e99bf]">Pedidos</p>
              <p className="mt-2 text-3xl font-black text-[#e2edff]">{totalOrders}</p>
            </article>
            <article className="loot-panel rounded-[1.2rem] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7e99bf]">Pagos</p>
              <p className="mt-2 text-3xl font-black text-[#a8ff94]">{paidOrders}</p>
            </article>
            <article className="loot-panel rounded-[1.2rem] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7e99bf]">Ticket medio</p>
              <p className="mt-2 text-3xl font-black text-[#e2edff]">{formatMoney(avgTicket, currency)}</p>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <article className="loot-panel rounded-[1.4rem] p-5 xl:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-black text-[#e2edff]">Faturamento por dia</h2>
                <p className="text-xs uppercase tracking-[0.14em] text-[#7e99bf]">Ultimos {revenueByDay.points.length} pontos</p>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
                {revenueByDay.points.map((point) => {
                  const heightPct = Math.max(8, Math.round((point.value / revenueByDay.maxValue) * 100));
                  return (
                    <div key={point.dayKey} className="flex flex-col items-center justify-end gap-2">
                      <div className="flex h-40 w-full items-end">
                        <div
                          className="w-full rounded-t-md bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_52%,#cc7a15_100%)]"
                          style={{ height: `${heightPct}%` }}
                          title={`${point.label} - ${formatMoney(point.value, currency)}`}
                        />
                      </div>
                      <span className="text-[10px] text-[#7e99bf]">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="loot-panel rounded-[1.4rem] p-5">
              <h2 className="text-xl font-black text-[#e2edff]">Status</h2>
              <div className="mt-4 space-y-3">
                {statusBreakdown.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#cfe2ff]">{row.label}</span>
                      <span className="text-[#8ea3c0]">{row.count} ({row.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ffffff14]">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#4db8ff,#7fd4ff)]"
                        style={{ width: `${Math.max(4, row.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="loot-panel rounded-[1.4rem] p-5">
              <h2 className="text-xl font-black text-[#e2edff]">Top jogos por valor</h2>
              <div className="mt-4 space-y-3">
                {gameRevenue.map((item) => {
                  const widthPct = Math.max(6, Math.round((item.value / topGameMax) * 100));
                  return (
                    <div key={item.game} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#cfe2ff]">{item.game}</span>
                        <span className="text-[#8ea3c0]">{formatMoney(item.value, currency)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#ffffff14]">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#a8ff94,#6fd968)]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="loot-panel rounded-[1.4rem] p-5">
              <h2 className="text-xl font-black text-[#e2edff]">Pedidos recentes</h2>
              <div className="mt-4 space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-[#ffffff12] bg-[#ffffff05] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#e2edff]">{order.gameTitle}</p>
                      <p className="text-xs text-[#8ea3c0]">
                        {order.nickname} · {formatDateTime(order.createdUnix)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#ffcf57]">{formatMoney(order.amountTotal, currency)}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
