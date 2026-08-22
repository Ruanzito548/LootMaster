"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Wallet2 } from "lucide-react";

import { auth } from "../../../lib/firebase";
import { useProfileSession } from "../use-profile-session";

type WalletHistoryItem = {
  id: string;
  kind: "credit" | "withdrawal" | "purchase" | "fee";
  category: "Fee" | "Withdrawal" | "Sale Receipt" | "Purchase";
  direction: "in" | "out" | "info";
  title: string;
  amount: number;
  unit: "loot" | "usd";
  status: string;
  method: string | null;
  reference: string | null;
  createdAt: string | null;
};

type WalletFilterState = {
  type: string;
  status: string;
  method: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_FILTERS: WalletFilterState = {
  type: "all",
  status: "all",
  method: "all",
  startDate: "",
  endDate: "",
};

const PAGE_SIZE = 10;

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n|\r/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLootAmount(value: number): string {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${value >= 0 ? "+" : "-"}${formatted} LC`;
}

function getTypeLabel(item: WalletHistoryItem): "Deposit" | "Purchase" | "Fee" | "Withdrawal" | "Reward" | "Refund" {
  if (item.kind === "purchase") return "Purchase";
  if (item.kind === "fee") return "Fee";
  if (item.kind === "withdrawal") return "Withdrawal";
  if (item.title.toLowerCase().includes("reward")) return "Reward";
  if (item.title.toLowerCase().includes("refund")) return "Refund";
  return "Deposit";
}

function getStatusLabel(value: string): string {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  if (!normalized) {
    return "Pending";
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("cancel")) return "Cancelled";
  if (lower.includes("fail")) return "Failed";
  if (lower.includes("process")) return "Processing";
  if (lower.includes("paid") || lower.includes("complete") || lower.includes("succeeded") || lower.includes("approved") || lower.includes("credited")) {
    return "Completed";
  }
  if (lower.includes("pending") || lower.includes("review") || lower.includes("waiting")) return "Pending";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getMethodLabel(value: string | null): string {
  if (!value) return "--";
  const normalized = value.toLowerCase();
  if (normalized.includes("pix")) return "PIX";
  if (normalized.includes("card") || normalized.includes("stripe")) return "Card";
  if (normalized.includes("paypal") || normalized.includes("pay-pal")) return "PayPal";
  if (normalized.includes("crypto") || normalized.includes("usdt") || normalized.includes("btc") || normalized.includes("eth")) return "Crypto";
  if (normalized.includes("balance")) return "Internal Balance";
  return value.toUpperCase();
}

function normalizeType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function normalizeMethod(value: string | null): string {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("card") || normalized.includes("stripe")) return "card";
  if (normalized.includes("paypal") || normalized.includes("pay-pal")) return "paypal";
  if (normalized.includes("crypto") || normalized.includes("usdt") || normalized.includes("btc") || normalized.includes("eth")) return "crypto";
  if (normalized.includes("balance") || normalized.includes("internal")) return "internal-balance";
  return normalized;
}

function getTypeClasses(type: string): string {
  switch (type) {
    case "Deposit":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "Purchase":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "Fee":
      return "border-orange-500/40 bg-orange-500/10 text-orange-300";
    case "Withdrawal":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
    case "Reward":
      return "border-violet-500/40 bg-violet-500/10 text-violet-200";
    case "Refund":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-200";
  }
}

function getStatusClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("paid") || normalized.includes("approved") || normalized.includes("credited")) {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  }
  if (normalized.includes("process")) {
    return "border-yellow-500/35 bg-yellow-500/10 text-yellow-200";
  }
  if (normalized.includes("pending") || normalized.includes("review")) {
    return "border-yellow-600/35 bg-yellow-500/10 text-yellow-200";
  }
  if (normalized.includes("fail") || normalized.includes("cancel")) {
    return "border-rose-500/35 bg-rose-500/10 text-rose-300";
  }
  return "border-slate-500/35 bg-slate-500/10 text-slate-200";
}

function getSummaryValue(items: WalletHistoryItem[], direction: "in" | "out"): number {
  return items.reduce((sum, item) => {
    if (item.direction !== direction) {
      return sum;
    }

    return sum + item.amount;
  }, 0);
}

function WalletSummary({ totalIn, totalOut, transactionCount, currentBalance }: { totalIn: number; totalOut: number; transactionCount: number; currentBalance: number; }) {
  const cards = [
    { label: "TOTAL IN", value: formatLootAmount(totalIn), tone: "text-emerald-300" },
    { label: "TOTAL OUT", value: formatLootAmount(-totalOut), tone: "text-rose-300" },
    { label: "TRANSACTIONS", value: transactionCount.toString(), tone: "text-slate-100" },
    {
      label: "CURRENT BALANCE",
      value: `${Math.abs(currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LC`,
      tone: "text-[#f2d27a]",
    },
  ];

  return (
    <div className="grid gap-4 pt-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-[#d4af5a]/20 bg-[#0d1823]/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(212,175,90,0.08)]">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#8ba9c6]">{card.label}</p>
          <p className={`mt-2 font-data text-2xl font-black ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function TransactionBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${getTypeClasses(type)}`}>
      {type}
    </span>
  );
}

function WalletFilters({ filters, onChange, onClear }: { filters: WalletFilterState; onChange: (next: WalletFilterState) => void; onClear: () => void; }) {
  const hasFilters = Object.values(filters).some((value) => value && value !== "all");

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[#d4af5a]/20 bg-[#0b1420]/80 p-4 md:flex-row md:items-end">
      <div className="grid flex-1 gap-3 md:grid-cols-4">
        <label className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
          Type
          <select
            value={filters.type}
            onChange={(event) => onChange({ ...filters, type: event.target.value })}
            className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="purchase">Purchase</option>
            <option value="fee">Fee</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="refund">Refund</option>
            <option value="reward">Reward</option>
          </select>
        </label>

        <label className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
          Status
          <select
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value })}
            className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
          Method
          <select
            value={filters.method}
            onChange={(event) => onChange({ ...filters, method: event.target.value })}
            className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
          >
            <option value="all">All Methods</option>
            <option value="pix">PIX</option>
            <option value="card">Card</option>
            <option value="paypal">PayPal</option>
            <option value="crypto">Crypto</option>
            <option value="internal-balance">Internal Balance</option>
          </select>
        </label>

        <div className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
          Date Range
          <div className="grid grid-cols-2 gap-2">
            <label className="relative block">
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => onChange({ ...filters, startDate: event.target.value })}
                className="loot-input block w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
              />
            </label>
            <label className="relative block">
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => onChange({ ...filters, endDate: event.target.value })}
                className="loot-input block w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        {hasFilters ? (
          <button type="button" onClick={onClear} className="rounded-full border border-[#d4af5a]/30 bg-[#0e1a24]/80 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#f4d67a] transition hover:border-[#d4af5a]/60 hover:bg-[#132330]">
            Clear Filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WalletPagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: { currentPage: number; totalPages: number; totalItems: number; pageSize: number; onPageChange: (page: number) => void; }) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 border-t border-[#d4af5a]/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#a0bbd0]">Showing {start}-{end} of {totalItems} transactions</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af5a]/30 bg-[#0d1823]/80 text-[#f5d48d] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold ${
              pageNumber === currentPage
                ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#f5d98e]"
                : "border-[#d4af5a]/20 bg-[#0d1823]/80 text-[#c9d9ef]"
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af5a]/30 bg-[#0d1823]/80 text-[#f5d48d] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ProfileWalletHistoryPage() {
  const { status, profile } = useProfileSession();
  const [items, setItems] = useState<WalletHistoryItem[]>([]);
  const [filters, setFilters] = useState<WalletFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedReference, setCopiedReference] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.status, filters.method, filters.startDate, filters.endDate]);

  const filteredItems = useMemo(() => {
    let nextItems = [...items];

    if (filters.type !== "all") {
      nextItems = nextItems.filter((item) => normalizeType(getTypeLabel(item)) === filters.type);
    }

    if (filters.status !== "all") {
      nextItems = nextItems.filter((item) => normalizeType(getStatusLabel(item.status)) === filters.status);
    }

    if (filters.method !== "all") {
      nextItems = nextItems.filter((item) => normalizeMethod(item.method) === filters.method);
    }

    if (filters.startDate) {
      nextItems = nextItems.filter((item) => {
        if (!item.createdAt) return false;
        const date = new Date(item.createdAt);
        return date >= new Date(`${filters.startDate}T00:00:00`);
      });
    }

    if (filters.endDate) {
      nextItems = nextItems.filter((item) => {
        if (!item.createdAt) return false;
        const date = new Date(item.createdAt);
        return date <= new Date(`${filters.endDate}T23:59:59`);
      });
    }

    return nextItems.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filters, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summary = useMemo(() => {
    const totalIn = getSummaryValue(items, "in");
    const totalOut = getSummaryValue(items, "out");
    return {
      totalIn,
      totalOut,
      transactionCount: items.length,
      currentBalance: Number(profile?.lootCoins ?? 0),
    };
  }, [items, profile?.lootCoins]);

  const exportCsv = () => {
    const header = ["Date", "Type", "Description", "Method", "Reference", "Status", "Amount"];
    const rows = filteredItems.map((item) => {
      const type = getTypeLabel(item);
      const amount = formatLootAmount(item.direction === "in" ? item.amount : -item.amount).replace(/ LC$/, "");
      return [
        formatTimestamp(item.createdAt),
        type,
        item.title,
        getMethodLabel(item.method),
        item.reference ?? "",
        getStatusLabel(item.status),
        amount,
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(String(value))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `wallet-history-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (status !== "authenticated" || !auth?.currentUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/profile/wallet-history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = (await response.json()) as { error?: string; items?: WalletHistoryItem[] };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load wallet history.");
        }

        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load wallet history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const copyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedReference(reference);
      window.setTimeout(() => setCopiedReference((current) => (current === reference ? null : current)), 1200);
    } catch (error) {
      console.error("Could not copy reference", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <p className="loot-muted text-sm">Loading wallet history...</p>
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Log in to view your wallet transactions.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Go to login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ffcf57]">Wallet History</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Wallet Statement</h1>
              <p className="loot-muted mt-2 max-w-2xl text-base leading-7">
                View all your transactions, deposits, purchases and withdrawals.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-[#d4af5a]/25 bg-[#0d1823]/80 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#e8c86f]">
              <Download className="h-3.5 w-3.5" />
              <button type="button" onClick={exportCsv} disabled={filteredItems.length === 0} className="disabled:opacity-40">
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm font-semibold text-red-300">{errorMessage}</p>
        ) : null}

        <section className="loot-panel mt-8 rounded-[2rem] p-6 sm:p-7">
          <WalletSummary totalIn={summary.totalIn} totalOut={summary.totalOut} transactionCount={summary.transactionCount} currentBalance={summary.currentBalance} />

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="flex-1">
              <WalletFilters
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(DEFAULT_FILTERS)}
              />
            </div>

            <Link href="/profile/withdraw" className="loot-secondary-button flex min-h-[92px] w-full items-center justify-center gap-3 rounded-[1.4rem] border border-[#d4af5a]/45 bg-[#120d09]/70 px-5 py-4 text-left text-[#f7d887] shadow-[inset_0_1px_0_rgba(212,175,90,0.12)] hover:border-[#d4af5a]/70 xl:max-w-[220px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af5a]/50 bg-[#101a22] text-[#f5d18f]">
                <Wallet2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-black uppercase tracking-[0.12em]">Withdraw</div>
                <div className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#b7c8d8]">Transfer your balance</div>
              </div>
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#d4af5a]/20 bg-[#091420]/80">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d4af5a]/15 bg-[#0d1824]/80 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#9ec8f4]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#a9bdd2]">
                        No transactions match your current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const kind = getTypeLabel(item);
                      const isIncome = item.direction === "in";
                      const amountText = formatLootAmount(isIncome ? item.amount : -item.amount);

                      return (
                        <tr key={item.id} className={`border-b border-[#d4af5a]/10 ${index % 2 === 0 ? "bg-[#0c1722]/55" : "bg-[#0b1520]/80"}`}>
                          <td className="px-4 py-3 text-[#bfcfe0]">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3"><TransactionBadge type={kind} /></td>
                          <td className="px-4 py-3">
                            <div className="max-w-[360px] truncate" title={item.title}>{item.title}</div>
                          </td>
                          <td className="px-4 py-3 text-[#d6e4f7]">{getMethodLabel(item.method)}</td>
                          <td className="px-4 py-3">
                            {item.reference ? (
                              <div className="flex items-center gap-2">
                                <span className="max-w-[180px] truncate text-[#d6e4f7]" title={item.reference}>{item.reference}</span>
                                <button
                                  type="button"
                                  onClick={() => void copyReference(item.reference ?? "")}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d4af5a]/25 bg-[#101c28] text-[#f5d48d] transition hover:border-[#d4af5a]/60"
                                  aria-label="Copy reference"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                {copiedReference === item.reference ? <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Copied</span> : null}
                              </div>
                            ) : (
                              <span className="text-[#7e95ad]">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${getStatusClasses(getStatusLabel(item.status))}`}>{getStatusLabel(item.status)}</span></td>
                          <td className={`px-4 py-3 text-right font-data font-black ${isIncome ? "text-emerald-300" : "text-red-300"}`}>
                            {amountText}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4">
              <WalletPagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                pageSize={PAGE_SIZE}
                onPageChange={(nextPage) => setPage(Math.min(Math.max(nextPage, 1), totalPages))}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
