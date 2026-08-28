"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Search, SlidersHorizontal, X } from "lucide-react";

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

function getSlaState(row: OrderRow, now: number): "on-time" | "soon" | "overdue" | "unknown" {
  const createdAt = row.createdAtIso ? new Date(row.createdAtIso).getTime() : Number.NaN;
  if (!Number.isFinite(createdAt)) return "unknown";
  const limit = row.deliveryMethod === "Face to face" ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const remaining = createdAt + limit - now;
  if (remaining <= 0) return "overdue";
  if (remaining <= 15 * 60 * 1000) return "soon";
  return "on-time";
}

function parseGoldAmount(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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
    | "sla"
  >("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [now, setNow] = useState(() => Date.now());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState("all");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    partner: "all",
    game: "all",
    server: "all",
    payment: "all",
    date: "all",
    sla: "all",
    value: "all",
    supplier: "all",
    faction: "all",
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rowsById = useMemo(() => {
    const map = new Map<string, OrderRow>();
    rows.forEach((row) => map.set(row.id, row));
    return map;
  }, [rows]);

  const paymentOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.paymentMethod).filter(Boolean))).sort(),
    [rows],
  );

  const gameOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.gameTitle).filter((value) => value && value !== "--"))).sort(), [rows]);
  const serverOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.server).filter((value) => value && value !== "--"))).sort(), [rows]);
  const partnerOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.agentName).filter((value) => value && value !== "--"))).sort(), [rows]);
  const factionOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.faction).filter((value) => value && value !== "--"))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const current = new Date(now);
    const start = new Date(current);
    start.setHours(0, 0, 0, 0);

    return rows.filter((row) => {
      const search = filters.search.trim().toLowerCase();
      const matchesSearch = !search || `${row.id} ${row.nickname} ${row.email}`.toLowerCase().includes(search);
      const matchesStatus = filters.status === "all" || row.status === filters.status;
      const matchesPartner = filters.partner === "all" || row.agentName === filters.partner;
      const matchesGame = filters.game === "all" || row.gameTitle === filters.game;
      const matchesServer = filters.server === "all" || row.server === filters.server;
      const matchesPayment = filters.payment === "all" || row.paymentMethod === filters.payment;
      const matchesSla = filters.sla === "all" || getSlaState(row, now) === filters.sla;
      const matchesFaction = filters.faction === "all" || row.faction === filters.faction;
      const matchesSupplier = filters.supplier === "all" || String(row.supplierPercentage) === filters.supplier;
      const matchesValue = filters.value === "all"
        || (filters.value === "under-50" && row.totalCents < 5000)
        || (filters.value === "50-200" && row.totalCents >= 5000 && row.totalCents <= 20000)
        || (filters.value === "over-200" && row.totalCents > 20000);
      const timestamp = row.createdAtIso ? new Date(row.createdAtIso).getTime() : Number.NaN;
      const matchesDate = filters.date === "all"
        || (Number.isFinite(timestamp) && filters.date === "today" && timestamp >= start.getTime())
        || (Number.isFinite(timestamp) && filters.date === "7" && timestamp >= start.getTime() - 7 * 86400000)
        || (Number.isFinite(timestamp) && filters.date === "30" && timestamp >= start.getTime() - 30 * 86400000)
        || (Number.isFinite(timestamp) && filters.date === "month" && timestamp >= new Date(current.getFullYear(), current.getMonth(), 1).getTime());
      const matchesQuick = quickFilter === "all"
        || (quickFilter === "paid" && row.status === "Paid")
        || (quickFilter === "pending" && row.status === "Unpaid")
        || (quickFilter === "overdue" && getSlaState(row, now) === "overdue")
        || (quickFilter === "unassigned" && row.agentName === "--");

      return (
        matchesSearch &&
        matchesDate &&
        matchesStatus &&
        matchesPartner &&
        matchesGame &&
        matchesServer &&
        matchesPayment &&
        matchesSla &&
        matchesFaction &&
        matchesSupplier &&
        matchesValue &&
        matchesQuick
      );
    });
  }, [filters, now, quickFilter, rows]);

  const sortedRows = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((left, right) => {
      let compare = 0;

      if (sortBy === "created") {
        compare = new Date(left.createdAtIso ?? 0).getTime() - new Date(right.createdAtIso ?? 0).getTime();
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
        compare = parseGoldAmount(left.goldAmount) - parseGoldAmount(right.goldAmount);
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
      } else if (sortBy === "sla") {
        const slaOrder = { overdue: 0, soon: 1, "on-time": 2, unknown: 3 };
        compare = slaOrder[getSlaState(left, now)] - slaOrder[getSlaState(right, now)];
      }

      return compare * directionMultiplier;
    });
  }, [filteredRows, now, sortBy, sortDirection]);

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
    setQuickFilter("all");
  }

  function clearFilters() {
    setFilters({ search: "", status: "all", partner: "all", game: "all", server: "all", payment: "all", date: "all", sla: "all", value: "all", supplier: "all", faction: "all" });
    setQuickFilter("all");
  }

  const quickCounts = {
    all: rows.length,
    paid: rows.filter((row) => row.status === "Paid").length,
    pending: rows.filter((row) => row.status === "Unpaid").length,
    overdue: rows.filter((row) => getSlaState(row, now) === "overdue").length,
    unassigned: rows.filter((row) => row.agentName === "--").length,
  };

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

      <div className="border-b border-white/8 bg-[#0b121d] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#748092]" />
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Buscar por nickname, e-mail ou ID do pedido..." className="w-full rounded-xl border border-white/10 bg-[#070c14] py-3 pl-10 pr-3 text-sm text-[#e2e6ea] outline-none transition placeholder:text-[#66758b] focus:border-[#d4af5a]/70" />
          </label>
          <button type="button" onClick={clearFilters} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d4af5a]/45 bg-[#17140d] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#e6c46a] transition hover:bg-[#2a2110]"><X className="size-4" /> Limpar filtros</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Status", "status", ["all", "Unpaid", "Paid", "Completed"]],
            ["Parceiro", "partner", ["all", "none", ...partnerOptions]],
            ["Jogo", "game", ["all", ...gameOptions]],
            ["Servidor", "server", ["all", ...serverOptions]],
            ["Pagamento", "payment", ["all", ...paymentOptions]],
          ].map(([label, key, options]) => <label key={String(key)} className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">{String(label)}<select value={filters[key as keyof typeof filters]} onChange={(event) => updateFilter(key as keyof typeof filters, event.target.value as never)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#dfe7f2] outline-none focus:border-[#d4af5a]/70">{(options as string[]).map((option) => <option key={option} value={option}>{option === "all" ? "Todos" : option === "none" ? "Sem parceiro" : option === "Unpaid" ? "Pendente" : option === "Paid" ? "Pago" : option === "Completed" ? "Finalizado" : option}</option>)}</select></label>)}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">Data<select value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#dfe7f2] outline-none focus:border-[#d4af5a]/70"><option value="all">Todos</option><option value="today">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="month">Este mês</option></select></label>
          <label className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">Prazo<select value={filters.sla} onChange={(event) => updateFilter("sla", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#dfe7f2] outline-none focus:border-[#d4af5a]/70"><option value="all">Todos</option><option value="on-time">No prazo</option><option value="soon">Próximo do vencimento</option><option value="overdue">Atrasado</option></select></label>
          <label className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">Valor<select value={filters.value} onChange={(event) => updateFilter("value", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#dfe7f2] outline-none focus:border-[#d4af5a]/70"><option value="all">Todos</option><option value="under-50">Até US$ 50</option><option value="50-200">US$ 50 a US$ 200</option><option value="over-200">Acima de US$ 200</option></select></label>
          <button type="button" onClick={() => setShowAdvancedFilters((current) => !current)} className="mt-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#d4af5a]/60 bg-transparent px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#e6c46a] transition hover:bg-[#d4af5a]/10"><SlidersHorizontal className="size-4" /> Mais filtros <ChevronDown className={`size-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} /></button>
        </div>

        {showAdvancedFilters ? <div className="mt-3 grid gap-3 border-t border-white/8 pt-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">Fornecedor %<select value={filters.supplier} onChange={(event) => updateFilter("supplier", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm normal-case tracking-normal text-[#dfe7f2]"><option value="all">Todos</option>{Array.from(new Set(rows.map((row) => String(row.supplierPercentage)))).sort((a, b) => Number(a) - Number(b)).map((value) => <option key={value} value={value}>{value}%</option>)}</select></label><label className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8e98a3]">Facção<select value={filters.faction} onChange={(event) => updateFilter("faction", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070c14] px-3 py-3 text-sm normal-case tracking-normal text-[#dfe7f2]"><option value="all">Todas</option>{factionOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><div className="flex items-end text-xs text-[#748092]">Filtros avançados usam apenas dados disponíveis nos pedidos carregados.</div></div> : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[{ id: "all", label: "Todos" }, { id: "paid", label: "Pagos" }, { id: "pending", label: "Pendentes" }, { id: "overdue", label: "Atrasados" }, { id: "unassigned", label: "Sem parceiro" }].map((chip) => <button key={chip.id} type="button" onClick={() => { setQuickFilter(chip.id); }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${quickFilter === chip.id ? "border-[#d4af5a]/70 bg-[#d4af5a]/15 text-[#f3d27b]" : "border-white/10 bg-[#070c14] text-[#8e98a3] hover:border-[#d4af5a]/40 hover:text-[#e6c46a]"}`}>{chip.label}<span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[0.65rem]">{quickCounts[chip.id as keyof typeof quickCounts]}</span></button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8e98a3]"><span>{sortedRows.length} visíveis <span className="mx-1 text-white/20">•</span> {rows.length} no total</span><button type="button" onClick={exportVisibleRows} className="inline-flex items-center gap-2 rounded-lg border border-[#d4af5a]/35 bg-[#17140d] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#e6c46a] transition hover:bg-[#2a2110]"><Download className="size-3.5" /> Exportar linhas visíveis</button></div>
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
            {showSlaTimer ? <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("sla")} className="inline-flex items-center gap-1">Prazo <span>{sortBy === "sla" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th> : null}
            <th className="px-2 py-2">Candidatos</th>
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
                      <span className="text-xs text-amber-300">{formatMoney(row.baseProductCents * (editingSupplierPercent / 100), row.currency)}</span>
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
