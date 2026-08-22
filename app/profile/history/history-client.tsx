"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ActivityOverviewSidebar } from "@/app/components/history/activity-overview-sidebar";
import { PremiumTransactionTable } from "@/app/components/history/premium-transaction-table";
import { classifyFlow, mergeDisplayRows, normalizeSearchIndex, type DisplayRow } from "@/lib/activity-history-display";
import type { ActivityCategory, ActivityHistoryLog, ActivityStatus } from "@/lib/activity-history-types";
import { auth } from "@/lib/firebase";

import { useProfileSession } from "../use-profile-session";

const FETCH_PAGE_SIZE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const MAX_AUTO_FETCH_LOOPS = 20;

type HistoryTab = "wallet" | "order" | "others";

type WalletFilterState = {
  type: string;
  status: string;
  method: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_WALLET_FILTERS: WalletFilterState = {
  type: "all",
  status: "all",
  method: "all",
  startDate: "",
  endDate: "",
};

type WalletHistoryRow = {
  id: string;
  kind: "credit" | "withdrawal" | "purchase" | "fee";
  category: "Fee" | "Withdrawal" | "Sale Receipt" | "Purchase";
  direction: "in" | "out" | "info";
  title: string;
  amount: number;
  goldAmount: number;
  unit: "loot" | "usd";
  status: string;
  method: string | null;
  reference: string | null;
  createdAt: string | null;
};

const HISTORY_TABS: { id: HistoryTab; label: string }[] = [
  { id: "wallet", label: "Wallet History" },
  { id: "order", label: "Purchase History" },
  { id: "others", label: "Others" },
];

async function getAuthorizationHeader() {
  const token = await auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchHistoryPage(cursor?: string | null) {
  const headers = await getAuthorizationHeader();
  if (!headers) {
    throw new Error("Unauthorized request.");
  }

  const url = new URL("/api/profile/history", window.location.origin);
  url.searchParams.set("limit", String(FETCH_PAGE_SIZE));
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: string;
    items?: ActivityHistoryLog[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load history.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function mergeUnique(current: ActivityHistoryLog[], incoming: ActivityHistoryLog[]) {
  const merged = [...current, ...incoming];
  return Array.from(new Map(merged.map((item) => [item.id, item])).values());
}

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n|\r/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export default function HistoryClient() {
  const { status, profile } = useProfileSession();
  const [items, setItems] = useState<ActivityHistoryLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ActivityCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<HistoryTab>("wallet");
  const [walletItems, setWalletItems] = useState<WalletHistoryRow[]>([]);
  const [walletFilters, setWalletFilters] = useState<WalletFilterState>(DEFAULT_WALLET_FILTERS);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const itemsRef = useRef<ActivityHistoryLog[]>([]);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const page = await fetchHistoryPage();
        if (cancelled) {
          return;
        }

        setItems(page.items);
        setNextCursor(page.nextCursor);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load history.");
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
  }, [profile, status]);

  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const response = await fetch("/api/profile/wallet-history", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });

        const payload = (await response.json()) as { error?: string; items?: WalletHistoryRow[] };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load wallet history.");
        }

        if (!cancelled) {
          setWalletItems(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load wallet history.");
        }
      } finally {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, status]);

  const matchesFilters = useCallback(
    (item: ActivityHistoryLog) => {
      const normalized = search.trim().toLowerCase();

      if (normalized && !normalizeSearchIndex(item).includes(normalized)) {
        return false;
      }

      if (category !== "all" && item.category !== category) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "all" && item.actionType !== typeFilter) {
        return false;
      }

      if (dateFrom) {
        const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
        if (!Number.isNaN(fromMs) && item.createdAtMs < fromMs) {
          return false;
        }
      }

      if (dateTo) {
        const toMs = new Date(`${dateTo}T23:59:59`).getTime();
        if (!Number.isNaN(toMs) && item.createdAtMs > toMs) {
          return false;
        }
      }

      return true;
    },
    [category, dateFrom, dateTo, search, statusFilter, typeFilter],
  );

  const nonMonetaryItems = useMemo(
    () => items.filter((item) => !item.valueUnit || !["usd", "brl", "loot"].includes(item.valueUnit)),
    [items],
  );

  const typeOptions = useMemo(() => {
    return Array.from(new Set(nonMonetaryItems.map((item) => item.actionType)));
  }, [nonMonetaryItems]);

  const filteredItems = useMemo(() => nonMonetaryItems.filter(matchesFilters), [nonMonetaryItems, matchesFilters]);
  const displayRows = useMemo<DisplayRow[]>(() => mergeDisplayRows(filteredItems), [filteredItems]);

  useEffect(() => {
    setPage(1);
  }, [search, category, statusFilter, typeFilter, dateFrom, dateTo, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / rowsPerPage));
  const pagedRows = displayRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage < 1) {
        return;
      }

      let loops = 0;
      while (
        loops < MAX_AUTO_FETCH_LOOPS &&
        nextCursorRef.current &&
        itemsRef.current.filter(matchesFilters).length < targetPage * rowsPerPage
      ) {
        loops += 1;
        setLoadingMore(true);
        try {
          const nextPage = await fetchHistoryPage(nextCursorRef.current);
          const merged = mergeUnique(itemsRef.current, nextPage.items);
          itemsRef.current = merged;
          nextCursorRef.current = nextPage.nextCursor;
          setItems(merged);
          setNextCursor(nextPage.nextCursor);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load more rows.");
          break;
        }
      }

      setLoadingMore(false);
      setPage(targetPage);
    },
    [matchesFilters, rowsPerPage],
  );

  const walletEntries = useMemo(
    () => walletItems.filter((item) => item.kind !== "purchase"),
    [walletItems],
  );

  const filteredWalletEntries = useMemo(() => {
    let nextItems = [...walletEntries];

    if (walletFilters.type !== "all") {
      nextItems = nextItems.filter((item) => {
        const typeLabel = getWalletTypeLabel(item).toLowerCase();
        return typeLabel === walletFilters.type.toLowerCase();
      });
    }

    if (walletFilters.status !== "all") {
      nextItems = nextItems.filter((item) => getWalletStatusLabel(item.status).toLowerCase() === walletFilters.status.toLowerCase());
    }

    if (walletFilters.method !== "all") {
      nextItems = nextItems.filter((item) => normalizeWalletMethod(item.method) === walletFilters.method);
    }

    if (walletFilters.startDate) {
      nextItems = nextItems.filter((item) => {
        if (!item.createdAt) return false;
        return new Date(item.createdAt) >= new Date(`${walletFilters.startDate}T00:00:00`);
      });
    }

    if (walletFilters.endDate) {
      nextItems = nextItems.filter((item) => {
        if (!item.createdAt) return false;
        return new Date(item.createdAt) <= new Date(`${walletFilters.endDate}T23:59:59`);
      });
    }

    return nextItems.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [walletEntries, walletFilters]);

  const orderEntries = useMemo(
    () => walletItems.filter((item) => item.kind === "purchase"),
    [walletItems],
  );

  const walletSummary = useMemo(() => {
    const totalIn = filteredWalletEntries.reduce((sum, item) => (item.direction === "in" ? sum + item.amount : sum), 0);
    const totalOut = filteredWalletEntries.reduce((sum, item) => (item.direction === "out" ? sum + item.amount : sum), 0);

    return {
      totalIn,
      totalOut,
      totalTransactions: filteredWalletEntries.length,
      currentBalance: Number(profile?.lootCoins ?? 0),
    };
  }, [filteredWalletEntries, profile?.lootCoins]);

  const orderSummary = useMemo(() => {
    const totalSpent = orderEntries.reduce((sum, item) => sum + item.amount, 0);
    return {
      totalSpent,
      totalOrders: orderEntries.length,
    };
  }, [orderEntries]);

  const summary = useMemo(() => {
    let gainsCount = 0;
    let lossesCount = 0;
    let gainsUsd = 0;
    let lossesUsd = 0;

    for (const row of displayRows) {
      const flow = classifyFlow(row);
      if (flow === "gain") {
        gainsCount += 1;
        if (row.valueUnit === "usd" && typeof row.value === "number") {
          gainsUsd += row.value;
        }
      } else if (flow === "loss") {
        lossesCount += 1;
        if (row.valueUnit === "usd" && typeof row.value === "number") {
          lossesUsd += Math.abs(row.value);
        }
      }
    }

    return {
      total: displayRows.length,
      gainsCount,
      lossesCount,
      gainsUsd,
      lossesUsd,
      netUsd: gainsUsd - lossesUsd,
    };
  }, [displayRows]);

  const formatUsd = (value: number) =>
    value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  const formatWalletAmount = (value: number, direction: "in" | "out" | "info") => {
    const prefix = direction === "in" ? "+" : direction === "out" ? "-" : "";
    return `${prefix}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LC`;
  };

  const getWalletTypeColor = (type: string) => {
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
      default:
        return "border-slate-500/40 bg-slate-500/10 text-slate-200";
    }
  };

  const getWalletStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes("complete") || lower.includes("paid") || lower.includes("approved") || lower.includes("credited")) {
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    }
    if (lower.includes("process")) {
      return "border-yellow-500/35 bg-yellow-500/10 text-yellow-200";
    }
    if (lower.includes("pending") || lower.includes("review")) {
      return "border-yellow-600/35 bg-yellow-500/10 text-yellow-200";
    }
    if (lower.includes("fail") || lower.includes("cancel")) {
      return "border-rose-500/35 bg-rose-500/10 text-rose-300";
    }
    return "border-slate-500/35 bg-slate-500/10 text-slate-200";
  };

  const getWalletTypeLabel = (item: WalletHistoryRow) => {
    if (item.kind === "purchase") return "Purchase";
    if (item.kind === "fee") return "Fee";
    if (item.kind === "withdrawal") return "Withdrawal";
    if (item.title.toLowerCase().includes("reward")) return "Reward";
    return "Deposit";
  };

  const getWalletStatusLabel = (value: string) => {
    const normalized = value.replace(/[_-]+/g, " ").trim();
    if (!normalized) return "Pending";
    const lower = normalized.toLowerCase();
    if (lower.includes("cancel")) return "Cancelled";
    if (lower.includes("fail")) return "Failed";
    if (lower.includes("process")) return "Processing";
    if (lower.includes("pending") || lower.includes("review")) return "Pending";
    if (lower.includes("paid") || lower.includes("complete") || lower.includes("approved") || lower.includes("credited")) return "Completed";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const normalizeWalletMethod = (value: string | null) => {
    if (!value) return "";
    const normalized = value.toLowerCase();
    if (normalized.includes("pix")) return "pix";
    if (normalized.includes("card") || normalized.includes("stripe")) return "card";
    if (normalized.includes("paypal") || normalized.includes("pay-pal")) return "paypal";
    if (normalized.includes("crypto") || normalized.includes("usdt") || normalized.includes("btc") || normalized.includes("eth")) return "crypto";
    if (normalized.includes("balance") || normalized.includes("internal")) return "internal-balance";
    return normalized;
  };

  const getWalletMethodLabel = (value: string | null) => {
    if (!value) return "--";
    const normalized = value.toLowerCase();
    if (normalized.includes("pix")) return "PIX";
    if (normalized.includes("card") || normalized.includes("stripe")) return "Card";
    if (normalized.includes("paypal") || normalized.includes("pay-pal")) return "PayPal";
    if (normalized.includes("crypto") || normalized.includes("usdt") || normalized.includes("btc") || normalized.includes("eth")) return "Crypto";
    if (normalized.includes("balance") || normalized.includes("internal")) return "Internal Balance";
    return value.toUpperCase();
  };

  const exportCsv = () => {
    const header = ["Date", "Action", "Source", "Reference", "Amount", "Unit", "Status"];
    const lines = [header.join(",")];

    for (const row of displayRows) {
      lines.push(
        [
          row.createdAt ?? "",
          row.actionType,
          row.origin,
          row.reference,
          typeof row.value === "number" ? String(row.value) : "",
          row.valueUnit ?? "",
          row.status,
        ]
          .map((value) => escapeCsv(String(value)))
          .join(","),
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transaction-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (status === "loading" || loading) {
    return (
      <div className="loot-shell">
        <main className="flex w-full flex-1 flex-col gap-6 pb-20 pt-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-12 w-80 animate-pulse rounded-2xl bg-white/10" />
          </section>
          <section className="loot-panel rounded-[2rem] p-6">
            <div className="grid gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
            <div className="mt-5 h-[420px] animate-pulse rounded-[1.6rem] bg-white/5" />
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="flex w-full flex-1 flex-col pb-20 pt-12">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Sign in to view your account history.</p>
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
      <main className="flex w-full flex-1 flex-col gap-6 pb-20 pt-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a1018] p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 15%, rgba(242,200,121,0.22), transparent 45%), radial-gradient(circle at 30% 110%, rgba(56,120,180,0.22), transparent 55%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#0a1018]" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {HISTORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.2em] transition ${
                    activeTab === tab.id
                      ? "border-[#f2c879]/60 bg-[#f2c879]/10 text-[#f8d98f]"
                      : "border-white/10 bg-black/20 text-[#b9cde1] hover:border-[#f2c879]/30"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "others" ? (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Link href="/profile" className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#8fd6ff]">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Account
                  </Link>
                  <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">Transaction History</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a8c1dc]">
                    Track your full account activity. All marketplace, wallet, chest openings, crafting, admin actions and progression events.
                  </p>
                </div>

                <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#8ca9c8]">
                      <Database className="h-3 w-3" />
                      Total Transactions
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">{summary.total}</p>
                    <p className="text-[0.6rem] font-semibold text-[#8ca9c8]">All time</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-emerald-200">
                      <TrendingUp className="h-3 w-3" />
                      Total Received
                    </div>
                    <p className="mt-2 text-2xl font-black text-emerald-100">{summary.gainsCount}</p>
                    <p className="text-[0.6rem] font-semibold text-emerald-200">+ {formatUsd(summary.gainsUsd)}</p>
                  </div>

                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-rose-200">
                      <TrendingDown className="h-3 w-3" />
                      Total Withdrawn
                    </div>
                    <p className="mt-2 text-2xl font-black text-rose-100">{summary.lossesCount}</p>
                    <p className="text-[0.6rem] font-semibold text-rose-200">- {formatUsd(summary.lossesUsd)}</p>
                  </div>

                  <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-sky-200">
                      <Scale className="h-3 w-3" />
                      Net Result
                    </div>
                    <p className={`mt-2 text-2xl font-black ${summary.netUsd >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                      {summary.netUsd >= 0 ? "+" : "-"} {formatUsd(Math.abs(summary.netUsd))}
                    </p>
                    <p className="text-[0.6rem] font-semibold text-sky-200">{summary.netUsd >= 0 ? "Profit" : "Loss"}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        {activeTab === "wallet" ? (
          <section className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-emerald-200">Total In</p>
                <p className="mt-2 font-data text-2xl font-black text-emerald-300">{formatWalletAmount(walletSummary.totalIn, "in")}</p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-rose-200">Total Out</p>
                <p className="mt-2 font-data text-2xl font-black text-rose-300">{formatWalletAmount(walletSummary.totalOut, "out")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#9bbad8]">Transactions</p>
                <p className="mt-2 font-data text-2xl font-black text-white">{walletSummary.totalTransactions}</p>
              </div>
              <div className="rounded-2xl border border-[#f2c879]/20 bg-[#17130d] px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#f2c879]">Current Balance</p>
                <p className="mt-2 font-data text-2xl font-black text-[#f2c879]">{formatWalletAmount(walletSummary.currentBalance, "in")}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end">
              <div className="grid flex-1 gap-3 md:grid-cols-4">
                <label className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
                  Type
                  <select
                    value={walletFilters.type}
                    onChange={(event) => setWalletFilters((current) => ({ ...current, type: event.target.value }))}
                    className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
                  >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="purchase">Purchase</option>
                    <option value="fee">Fee</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="reward">Reward</option>
                  </select>
                </label>

                <label className="grid gap-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#9db9d1]">
                  Status
                  <select
                    value={walletFilters.status}
                    onChange={(event) => setWalletFilters((current) => ({ ...current, status: event.target.value }))}
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
                    value={walletFilters.method}
                    onChange={(event) => setWalletFilters((current) => ({ ...current, method: event.target.value }))}
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
                    <input
                      type="date"
                      value={walletFilters.startDate}
                      onChange={(event) => setWalletFilters((current) => ({ ...current, startDate: event.target.value }))}
                      className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
                    />
                    <input
                      type="date"
                      value={walletFilters.endDate}
                      onChange={(event) => setWalletFilters((current) => ({ ...current, endDate: event.target.value }))}
                      className="loot-input rounded-xl px-3 py-2.5 text-sm font-semibold text-[#edf5ff]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => setWalletFilters(DEFAULT_WALLET_FILTERS)}
                  className="rounded-full border border-[#d4af5a]/30 bg-[#0e1a24]/80 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#f4d67a] transition hover:border-[#d4af5a]/60 hover:bg-[#132330]"
                >
                  Clear Filters
                </button>
                <Link href="/profile/withdraw" className="loot-secondary-button flex min-h-[64px] items-center justify-center gap-3 rounded-[1.2rem] border border-[#d4af5a]/45 bg-[#120d09]/70 px-4 py-3 text-left text-[#f7d887] shadow-[inset_0_1px_0_rgba(212,175,90,0.12)] hover:border-[#d4af5a]/70">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af5a]/50 bg-[#101a22] text-[#f5d18f]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.12em]">Withdraw</div>
                    <div className="mt-1 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[#b7c8d8]">Transfer your balance</div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0b1823] text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#93bfe9]">
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
                    {filteredWalletEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#a8c1dc]">
                          No wallet entries match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredWalletEntries.map((item, index) => {
                        const label = getWalletTypeLabel(item);
                        const statusLabel = getWalletStatusLabel(item.status);
                        const amount = item.direction === "in" ? item.amount : -item.amount;
                        return (
                          <tr key={item.id} className={`border-b border-white/5 ${index % 2 === 0 ? "bg-[#0c1620]" : "bg-[#0b141d]"}`}>
                            <td className="px-4 py-3 text-[#bfd2e8]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US") : "--"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${getWalletTypeColor(label)}`}>{label}</span></td>
                            <td className="px-4 py-3 text-[#edf5ff]"><div className="max-w-[360px] truncate" title={item.title}>{item.title}</div></td>
                            <td className="px-4 py-3 text-[#cfe1f6]">{getWalletMethodLabel(item.method)}</td>
                            <td className="px-4 py-3 text-[#cfe1f6]">{item.reference ? <span className="max-w-[180px] truncate inline-block" title={item.reference}>{item.reference}</span> : "--"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${getWalletStatusColor(statusLabel)}`}>{statusLabel}</span></td>
                            <td className={`px-4 py-3 text-right font-data font-black ${amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatWalletAmount(amount, amount >= 0 ? "in" : "out")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "order" ? (
          <section className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#9bbad8]">Orders</p>
                <p className="mt-2 font-data text-2xl font-black text-white">{orderSummary.totalOrders}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-sky-200">Total Paid</p>
                <p className="mt-2 font-data text-2xl font-black text-sky-300">{formatUsd(orderSummary.totalSpent)}</p>
              </div>
              <div className="rounded-2xl border border-[#f2c879]/20 bg-[#17130d] px-4 py-3">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#f2c879]">Payment Methods</p>
                <p className="mt-2 text-lg font-black text-[#f2c879]">Card / Stripe / PayPal</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0b1823] text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#93bfe9]">
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
                    {orderEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#a8c1dc]">
                          No purchase payments found.
                        </td>
                      </tr>
                    ) : (
                      orderEntries.map((item, index) => (
                        <tr key={item.id} className={`border-b border-white/5 ${index % 2 === 0 ? "bg-[#0c1620]" : "bg-[#0b141d]"}`}>
                          <td className="px-4 py-3 text-[#bfd2e8]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US") : "--"}</td>
                          <td className="px-4 py-3"><span className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-sky-300">Purchase</span></td>
                          <td className="px-4 py-3 text-[#edf5ff]">
                            <div className="max-w-[360px] truncate" title={item.title}>{item.title}</div>
                            {item.goldAmount > 0 ? <div className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#f2c879]">{item.goldAmount.toLocaleString("en-US")} Gold purchased</div> : null}
                          </td>
                          <td className="px-4 py-3 text-[#cfe1f6]">{getWalletMethodLabel(item.method)}</td>
                          <td className="px-4 py-3 text-[#cfe1f6]">{item.reference ? <span className="max-w-[180px] truncate inline-block" title={item.reference}>{item.reference}</span> : "--"}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${getWalletStatusColor(getWalletStatusLabel(item.status))}`}>{getWalletStatusLabel(item.status)}</span></td>
                          <td className="px-4 py-3 text-right font-data font-black text-emerald-300">{formatUsd(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "others" ? (
          <>
            {/* Filter bar */}
            <section className="rounded-[1.5rem] border border-[#f2c879]/12 bg-[#0b131d] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86a9cf]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by reference, name or action..."
                    className="w-full rounded-xl border border-white/12 bg-black/25 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#f2c879]"
                  />
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as "all" | ActivityCategory)}
                  className="rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2c879]"
                >
                  <option value="all">All Sources</option>
                  <option value="economy">Economy</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="inventory">Inventory</option>
                  <option value="chests">Chest Opening</option>
                  <option value="crafting">Crafting</option>
                  <option value="admin">Admin</option>
                  <option value="progression">Progression</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2c879]"
                >
                  <option value="all">All Types</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | ActivityStatus)}
                  className="rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2c879]"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="system">System</option>
                </select>

                <div className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-black/25 px-3 py-2">
                  <Calendar className="h-4 w-4 shrink-0 text-[#86a9cf]" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="bg-transparent text-xs text-white outline-none [color-scheme:dark]"
                  />
                  <span className="text-xs text-[#6f89a8]">–</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="bg-transparent text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#f2c879]/50 px-4 py-2.5 text-sm font-bold text-[#f2c879] transition hover:bg-[#f2c879]/10"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[3fr_1fr]">
              <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-4 sm:p-5">
                <PremiumTransactionTable
                  rows={pagedRows}
                  loading={loadingMore}
                  emptyLabel="No transactions matched the current filters."
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
                  <p className="text-xs font-semibold text-[#8ca9c8]">
                    Showing {displayRows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to{" "}
                    {Math.min(page * rowsPerPage, displayRows.length)} of {displayRows.length}
                    {nextCursorRef.current ? "+" : ""} transactions
                  </p>

                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void goToPage(page - 1)}
                      disabled={page <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#c7daef] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1)
                      .reduce<(number | "ellipsis")[]>((acc, pageNumber) => {
                        const previous = acc[acc.length - 1];
                        if (typeof previous === "number" && pageNumber - previous > 1) {
                          acc.push("ellipsis");
                        }
                        acc.push(pageNumber);
                        return acc;
                      }, [])
                      .map((entry, index) =>
                        entry === "ellipsis" ? (
                          <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#6f89a8]">
                            ...
                          </span>
                        ) : (
                          <button
                            key={entry}
                            type="button"
                            onClick={() => void goToPage(entry)}
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                              entry === page ? "bg-[#f2c879] text-black" : "border border-white/10 text-[#c7daef] hover:bg-white/10"
                            }`}
                          >
                            {entry}
                          </button>
                        ),
                      )}

                    <button
                      type="button"
                      onClick={() => void goToPage(page + 1)}
                      disabled={page >= totalPages && !nextCursorRef.current}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#c7daef] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#8ca9c8]">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => setRowsPerPage(Number(event.target.value))}
                      className="rounded-lg border border-white/12 bg-black/25 px-2 py-1 text-xs text-white outline-none focus:border-[#f2c879]"
                    >
                      {ROWS_PER_PAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <ActivityOverviewSidebar rows={displayRows} />
            </section>
          </>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/wallet-history" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet statement
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
