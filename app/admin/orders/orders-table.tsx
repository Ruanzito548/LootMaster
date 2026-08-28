"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { OrderRow } from "./export-button";

function formatMoney(cents: number, currencyCode: string): string {
  const currency = currencyCode.trim().toUpperCase();
  const supportedCurrency = currency === "BRL" || currency === "EUR" ? currency : "USD";
  const locale = supportedCurrency === "BRL" ? "pt-BR" : supportedCurrency === "EUR" ? "de-DE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: supportedCurrency,
  }).format(cents / 100);
}

function OrderSlaTimer({ createdAtIso, deliveryMethod }: Pick<OrderRow, "createdAtIso" | "deliveryMethod">) {
  const [now, setNow] = useState(() => Date.now());
  const deliveryLimitMs = deliveryMethod === "Face to face" ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const createdAt = createdAtIso ? new Date(createdAtIso).getTime() : Number.NaN;
  const remainingMs = Number.isFinite(createdAt) ? createdAt + deliveryLimitMs - now : 0;
  const isOverdue = remainingMs <= 0;
  const absoluteMs = Math.abs(remainingMs);
  const totalSeconds = Math.floor(absoluteMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!Number.isFinite(createdAt)) {
    return <span className="text-xs text-slate-500">Desconhecido</span>;
  }

  return (
    <span className={`font-data text-[0.65rem] font-bold ${isOverdue ? "text-red-300" : "text-amber-300"}`}>
      {isOverdue ? "Atrasada há" : "Vence em"} {hours > 0 ? `${hours}h ` : ""}{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export default function OrdersTable({ rows, showSlaTimer = false }: { rows: OrderRow[]; showSlaTimer?: boolean }) {
  return <OrdersTableWithActions rows={rows} showSlaTimer={showSlaTimer} />;
}

type OrdersTableWithActionsProps = {
  rows: OrderRow[];
  onReload?: () => void | Promise<void>;
  showSlaTimer?: boolean;
};

export function OrdersTableWithActions({ rows, onReload, showSlaTimer = false }: OrdersTableWithActionsProps) {
  const router = useRouter();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingSupplierPercent, setEditingSupplierPercent] = useState<number>(0);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    | "created"
    | "status"
    | "agent"
    | "nickname"
    | "email"
    | "game"
    | "gold"
    | "server"
    | "value"
    | "payout"
    | "profit"
    | "supplier"
    | "payment"
  >("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    date: "",
    status: "Todos",
    agent: "",
    nickname: "",
    email: "",
    game: "",
    payment: "Todos",
  });

  const rowsById = useMemo(() => {
    const map = new Map<string, OrderRow>();
    rows.forEach((row) => map.set(row.id, row));
    return map;
  }, [rows]);

  const statusOptions = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).sort()],
    [rows],
  );

  const paymentOptions = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((row) => row.paymentMethod).filter(Boolean))).sort()],
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesDate = filters.date
        ? row.created.toLowerCase().includes(filters.date.trim().toLowerCase())
        : true;
      const matchesStatus = filters.status === "Todos" ? true : row.status === filters.status;
      const matchesNickname = filters.nickname
        ? row.nickname.toLowerCase().includes(filters.nickname.trim().toLowerCase())
        : true;
      const matchesAgent = filters.agent
        ? `${row.agentName} ${row.agentEmail}`.toLowerCase().includes(filters.agent.trim().toLowerCase())
        : true;
      const matchesEmail = filters.email
        ? row.email.toLowerCase().includes(filters.email.trim().toLowerCase())
        : true;
      const matchesGame = filters.game
        ? `${row.gameTitle} ${row.categoryTitle}`.toLowerCase().includes(filters.game.trim().toLowerCase())
        : true;
      const matchesPayment = filters.payment === "Todos" ? true : row.paymentMethod === filters.payment;

      return (
        matchesDate &&
        matchesStatus &&
        matchesAgent &&
        matchesNickname &&
        matchesEmail &&
        matchesGame &&
        matchesPayment
      );
    });
  }, [filters, rows]);

  const sortedRows = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((left, right) => {
      let compare = 0;

      if (sortBy === "created") {
        compare = new Date(left.created).getTime() - new Date(right.created).getTime();
      } else if (sortBy === "status") {
        compare = left.status.localeCompare(right.status, "en-US", { sensitivity: "base" });
      } else if (sortBy === "nickname") {
        compare = left.nickname.localeCompare(right.nickname, "en-US", { sensitivity: "base" });
      } else if (sortBy === "agent") {
        compare = `${left.agentName} ${left.agentEmail}`.localeCompare(
          `${right.agentName} ${right.agentEmail}`,
          "en-US",
          { sensitivity: "base" },
        );
      } else if (sortBy === "email") {
        compare = left.email.localeCompare(right.email, "en-US", { sensitivity: "base" });
      } else if (sortBy === "game") {
        compare = `${left.gameTitle} ${left.categoryTitle}`.localeCompare(
          `${right.gameTitle} ${right.categoryTitle}`,
          "en-US",
          { sensitivity: "base" },
        );
      } else if (sortBy === "gold") {
        compare = Number(left.goldAmount.replace(/,/g, "")) - Number(right.goldAmount.replace(/,/g, ""));
      } else if (sortBy === "server") {
        compare = `${left.server} ${left.faction}`.localeCompare(`${right.server} ${right.faction}`, "en-US", {
          sensitivity: "base",
        });
      } else if (sortBy === "value") {
        compare = left.totalCents - right.totalCents;
      } else if (sortBy === "payout") {
        compare = left.supplierPayout - right.supplierPayout;
      } else if (sortBy === "profit") {
        compare = left.grossProfit - right.grossProfit;
      } else if (sortBy === "supplier") {
        compare = left.supplierPercentage - right.supplierPercentage;
      } else if (sortBy === "payment") {
        compare = left.paymentMethod.localeCompare(right.paymentMethod, "en-US", { sensitivity: "base" });
      }

      return compare * directionMultiplier;
    });
  }, [filteredRows, sortBy, sortDirection]);

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortDirection(column === "created" ? "desc" : "asc");
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportVisibleRows() {
    const headers = [
      "ID",
          "Data", "Status", "Parceiro", "Nickname", "E-mail", "Jogo", "Categoria", "Gold", "Servidor", "Facção", "Valor", "Repasse", "Lucro Bruto", "Lucro Líquido", "Fornecedor", "Fornecedor %", "Entrega", "Pagamento",
    ];

    const csvRows = sortedRows.map((row) =>
      [
        row.id,
        row.created,
        row.status,
        row.agentName,
        row.nickname,
        row.email,
        row.gameTitle,
        row.categoryTitle,
        row.goldAmount,
        row.server,
        row.faction,
        formatMoney(row.totalCents, row.currency),
        formatMoney(row.supplierPayout, row.currency),
        formatMoney(row.grossProfit, row.currency),
        formatMoney(row.netProfit, row.currency),
        row.supplierName,
        `${row.supplierPercentage}%`,
        row.deliveryMethod,
        row.paymentMethod,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveSupplier(orderId: string) {
    const row = rowsById.get(orderId);
    if (!row) {
      return;
    }

    const percent = Number(editingSupplierPercent);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setErrorMessage("A porcentagem do fornecedor deve estar entre 0 e 100.");
      return;
    }

    setSavingOrderId(orderId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/orders/update-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          supplierName: row.supplierName === "--" ? "" : row.supplierName,
          supplierPercentage: percent,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Não foi possível atualizar o fornecedor.");
        return;
      }

      setEditingOrderId(null);
      if (onReload) {
        await onReload();
      } else {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar o fornecedor.");
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-[#0a0f16] shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      {errorMessage ? (
        <p className="border-b border-red-900 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#101722] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8e98a3]">
          <span>{sortedRows.length} visíveis</span>
          <span>•</span>
          <span>{rows.length} no total</span>
        </div>
        <button
          type="button"
          onClick={exportVisibleRows}
          className="rounded-lg border border-[#d4af5a]/35 bg-[#17140d] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#e6c46a] transition hover:bg-[#2a2110]"
        >
          Exportar linhas visíveis
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full table-fixed text-left text-xs">
        <thead>
          <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("created")} className="inline-flex items-center gap-1">Data <span>{sortBy === "created" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1">Status <span>{sortBy === "status" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("agent")} className="inline-flex items-center gap-1">Parceiro <span>{sortBy === "agent" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("nickname")} className="inline-flex items-center gap-1">Nickname <span>{sortBy === "nickname" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("email")} className="inline-flex items-center gap-1">E-mail <span>{sortBy === "email" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("game")} className="inline-flex items-center gap-1">Jogo <span>{sortBy === "game" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("gold")} className="inline-flex items-center gap-1">Gold <span>{sortBy === "gold" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("server")} className="inline-flex items-center gap-1">Servidor <span>{sortBy === "server" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("value")} className="inline-flex items-center gap-1">Valor <span>{sortBy === "value" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("payout")} className="inline-flex items-center gap-1">Repasse <span>{sortBy === "payout" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("profit")} className="inline-flex items-center gap-1">Lucro <span>{sortBy === "profit" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("supplier")} className="inline-flex items-center gap-1">Fornecedor % <span>{sortBy === "supplier" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("payment")} className="inline-flex items-center gap-1">Pagamento <span>{sortBy === "payment" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            {showSlaTimer ? <th className="px-2 py-2">Prazo</th> : null}
            <th className="px-2 py-2">Candidatos</th>
          </tr>
          <tr className="border-b border-green-950 bg-green-950/10 text-[11px] text-green-400">
            <th className="px-2 py-2">
              <input value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} placeholder="Filtrar" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300">
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </th>
            <th className="px-2 py-2">
              <input value={filters.agent} onChange={(event) => updateFilter("agent", event.target.value)} placeholder="Filtrar" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.nickname} onChange={(event) => updateFilter("nickname", event.target.value)} placeholder="Filtrar" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.email} onChange={(event) => updateFilter("email", event.target.value)} placeholder="Filtrar" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.game} onChange={(event) => updateFilter("game", event.target.value)} placeholder="Filtrar" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2">
              <select value={filters.payment} onChange={(event) => updateFilter("payment", event.target.value)} className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300">
                {paymentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </th>
            {showSlaTimer ? <th className="px-2 py-2" /> : null}
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => {
            const isEditing = editingOrderId === row.id;
            const isSaving = savingOrderId === row.id;

            return (
              <tr
                key={row.id}
                className={`border-b border-green-950 transition-colors hover:bg-green-950/40 ${
                  i % 2 === 0 ? "" : "bg-green-950/20"
                }`}
              >
                <td className="break-words px-2 py-2 text-[11px] text-green-600">{row.created}</td>
                <td className="px-2 py-2">
                  <span
                    className={`text-xs font-semibold ${
                      row.status === "Completed"
                        ? "text-blue-400"
                        : row.status === "Paid"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {row.status === "Paid" ? "Pago" : row.status === "Completed" ? "Completo" : row.status === "Unpaid" ? "Não pago" : row.status}
                  </span>
                </td>
                <td className="break-words px-2 py-2 text-[11px] text-cyan-300">
                  <p>{row.agentName}</p>
                  {row.agentEmail !== "--" ? <p className="text-cyan-500">{row.agentEmail}</p> : null}
                </td>
                <td className="break-words px-2 py-2 font-medium text-green-300">{row.nickname}</td>
                <td className="break-all px-2 py-2 text-[11px] text-green-500">{row.email}</td>
                <td className="break-words px-2 py-2 text-green-400">
                  {row.gameTitle}
                  {row.categoryTitle !== "--" ? <span className="ml-1 text-xs text-green-600">/ {row.categoryTitle}</span> : null}
                </td>
                <td className="px-2 py-2 text-green-400">{row.goldAmount}</td>
                <td className="break-words px-2 py-2 text-[11px] text-green-500">
                  {row.server !== "--" ? row.server : ""}
                  {row.faction !== "--" ? ` / ${row.faction}` : ""}
                  {row.server === "--" && row.faction === "--" ? "--" : ""}
                </td>
                <td className="px-2 py-2 font-semibold text-green-300">{formatMoney(row.totalCents, row.currency)}</td>
                <td className="px-2 py-2 text-amber-300">{formatMoney(row.supplierPayout, row.currency)}</td>
                <td className="px-2 py-2 text-cyan-300">{formatMoney(row.grossProfit, row.currency)}</td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={editingSupplierPercent}
                        onChange={(event) => setEditingSupplierPercent(Number(event.target.value))}
                        className="w-16 rounded border border-green-800 bg-black px-1 py-1 text-xs text-green-300"
                      />
                      <span className="text-xs text-green-500">%</span>
                      <span className="text-xs text-amber-300">{formatMoney(row.totalCents * (editingSupplierPercent / 100), row.currency)}</span>
                      <button
                        type="button"
                        onClick={() => void saveSupplier(row.id)}
                        disabled={isSaving}
                        className="rounded border border-amber-700 bg-amber-950/30 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-950/50 disabled:opacity-50"
                      >
                        {isSaving ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold text-green-300">{row.supplierPercentage}%</span>
                      <span className="text-[10px] text-green-500">{row.supplierName || "--"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrderId(row.id);
                          setEditingSupplierPercent(row.supplierPercentage);
                        }}
                        className="rounded border border-green-800 px-2 py-1 text-xs font-semibold text-green-300 hover:bg-green-950"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 text-xs font-medium uppercase text-green-400">{row.paymentMethod}</td>
                {showSlaTimer ? (
                  <td className="px-2 py-2">
                    <OrderSlaTimer createdAtIso={row.createdAtIso} deliveryMethod={row.deliveryMethod} />
                  </td>
                ) : null}
                <td className="px-2 py-2">
                  <Link
                    href={`/admin/orders/${row.id}`}
                    className="inline-flex rounded-md border border-green-800 px-2 py-1 text-[11px] font-semibold text-green-300 transition hover:bg-green-950"
                  >
                    Ver candidatos
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
