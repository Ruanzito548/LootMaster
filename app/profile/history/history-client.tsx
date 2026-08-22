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
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a1018] p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 15%, rgba(242,200,121,0.22), transparent 45%), radial-gradient(circle at 30% 110%, rgba(56,120,180,0.22), transparent 55%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#0a1018]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

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

        {/* Table + sidebar */}
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
