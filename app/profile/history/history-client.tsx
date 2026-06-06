"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Database, Search, SlidersHorizontal, Wallet } from "lucide-react";

import { ActivityLogTable } from "@/app/components/history/activity-log-table";
import type { ActivityCategory, ActivityHistoryLog, ActivityStatus } from "@/lib/activity-history-types";
import { auth } from "@/lib/firebase";

import { useProfileSession } from "../use-profile-session";

const PAGE_SIZE = 25;

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
  url.searchParams.set("limit", String(PAGE_SIZE));
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

function normalizeSearch(item: ActivityHistoryLog) {
  return [
    item.reference,
    item.description,
    item.itemName,
    item.origin,
    item.actionType,
    item.rarity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);

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
    if (!loadMoreRef.current || !nextCursor || loadingMore || loading) {
      return;
    }

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        void (async () => {
          setLoadingMore(true);
          try {
            const page = await fetchHistoryPage(nextCursor);
            startTransition(() => {
              setItems((current) => {
                const merged = [...current, ...page.items];
                return Array.from(new Map(merged.map((item) => [item.id, item])).values());
              });
              setNextCursor(page.nextCursor);
            });
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more rows.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, nextCursor]);

  const typeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.actionType)))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (normalized && !normalizeSearch(item).includes(normalized)) {
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

      return true;
    });
  }, [category, deferredSearch, items, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      credits: items.filter((item) => {
        const action = item.actionType.toLowerCase();
        return !action.includes("withdraw") && !action.includes("buy") && !action.includes("fee") && !action.includes("consumed");
      }).length,
      debits: items.filter((item) => {
        const action = item.actionType.toLowerCase();
        return action.includes("withdraw") || action.includes("buy") || action.includes("fee") || action.includes("consumed");
      }).length,
    };
  }, [items]);

  if (status === "loading" || loading) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
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
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2rem] border border-white/12 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#8fd6ff]">Account History</p>
              <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">Compact transaction log</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a8c1dc]">
                Spreadsheet-style activity table for fast scanning of marketplace, wallet, chest, crafting, admin and progression events.
              </p>
            </div>

            <div className="grid min-w-[240px] gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8ca9c8]">Rows</p>
                <p className="mt-2 text-2xl font-black text-white">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-emerald-200">Gains</p>
                <p className="mt-2 text-2xl font-black text-emerald-100">{summary.credits}</p>
              </div>
              <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-rose-200">Losses</p>
                <p className="mt-2 text-2xl font-black text-rose-100">{summary.debits}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        <section className="loot-panel rounded-[2rem] border border-white/12 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#86a9cf]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by reference, name or action"
                className="w-full rounded-xl border border-white/12 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#7dd6ff]"
              />
            </label>

            <select value={category} onChange={(event) => setCategory(event.target.value as "all" | ActivityCategory)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7dd6ff]">
              <option value="all">All sources</option>
              <option value="economy">Economy</option>
              <option value="marketplace">Marketplace</option>
              <option value="inventory">Inventory</option>
              <option value="chests">Chest Opening</option>
              <option value="crafting">Crafting</option>
              <option value="admin">Admin</option>
              <option value="progression">Progression</option>
            </select>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7dd6ff]">
              <option value="all">All types</option>
              {typeOptions.filter((option) => option !== "all").map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ActivityStatus)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7dd6ff]">
              <option value="all">All status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#8ea9c8]">
              <SlidersHorizontal className="h-4 w-4" />
              {filteredItems.length} visible rows
            </div>
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#8ea9c8]">
              <Database className="h-4 w-4" />
              Infinite pagination enabled
            </div>
          </div>

          <div className="mt-5">
            <ActivityLogTable items={filteredItems} loadingMore={loadingMore} emptyLabel="No history rows matched the current filters." />
          </div>

          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#8ea9c8]">
              {nextCursor ? "Scroll to load more" : "No more rows"}
            </span>
          </div>
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
