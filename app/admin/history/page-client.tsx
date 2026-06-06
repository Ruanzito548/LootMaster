"use client";

import Link from "next/link";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Search, Shield, SlidersHorizontal, TableProperties } from "lucide-react";
import type { User } from "firebase/auth";

import { ActivityLogTable } from "@/app/components/history/activity-log-table";
import type { ActivityCategory, ActivityHistoryLog, ActivityStatus } from "@/lib/activity-history-types";
import { useProfileSession } from "@/app/profile/use-profile-session";

const PAGE_SIZE = 30;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchAdminHistoryPage(input: {
  user: User | null;
  cursor?: string | null;
  userUid?: string;
  category?: string;
  actionType?: string;
  status?: string;
}) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/history", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));

  if (input.cursor) url.searchParams.set("cursor", input.cursor);
  if (input.userUid) url.searchParams.set("userUid", input.userUid);
  if (input.category && input.category !== "all") url.searchParams.set("category", input.category);
  if (input.actionType && input.actionType !== "all") url.searchParams.set("actionType", input.actionType);
  if (input.status && input.status !== "all") url.searchParams.set("status", input.status);

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
    throw new Error(payload.error ?? "Could not load admin history.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function normalizeSearch(item: ActivityHistoryLog) {
  return [
    item.reference,
    item.userUid,
    item.userShortId,
    item.userDisplayName,
    item.description,
    item.itemName,
    item.origin,
    item.actionType,
    item.relatedUserName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminHistoryClient() {
  const { status: sessionStatus, user } = useProfileSession();
  const [items, setItems] = useState<ActivityHistoryLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userUid, setUserUid] = useState("");
  const [category, setCategory] = useState<"all" | ActivityCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);

  const actionTypeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.actionType)))];
  }, [items]);

  const reload = useCallback(async () => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!user) {
      setLoading(false);
      setErrorMessage("Sign in required to access admin history.");
      setItems([]);
      setNextCursor(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const page = await fetchAdminHistoryPage({
        user,
        userUid: userUid.trim(),
        category,
        actionType: typeFilter,
        status: statusFilter,
      });

      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load admin history.");
    } finally {
      setLoading(false);
    }
  }, [category, sessionStatus, statusFilter, typeFilter, user, userUid]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
            const page = await fetchAdminHistoryPage({
              user,
              cursor: nextCursor,
              userUid: userUid.trim(),
              category,
              actionType: typeFilter,
              status: statusFilter,
            });

            startTransition(() => {
              setItems((current) => {
                const merged = [...current, ...page.items];
                return Array.from(new Map(merged.map((item) => [item.id, item])).values());
              });
              setNextCursor(page.nextCursor);
            });
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more admin rows.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [category, loading, loadingMore, nextCursor, statusFilter, typeFilter, user, userUid]);

  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => normalizeSearch(item).includes(normalized));
  }, [deferredSearch, items]);

  const suspiciousCount = useMemo(() => {
    return items.filter((item) => item.status === "failed" || item.status === "rejected").length;
  }, [items]);

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="flex w-full flex-1 flex-col gap-6 pb-20 pt-12">
        <section className="rounded-[2rem] border border-green-900 bg-green-950/20 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
              <h1 className="mt-3 text-4xl font-black text-green-300 sm:text-5xl">Global History Table</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-green-600">
                Compact spreadsheet view for all users, transaction references, admin actions and suspicious movements.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-green-900 bg-black/20 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-green-600">Loaded rows</p>
                <p className="mt-2 text-2xl font-black text-green-300">{items.length}</p>
              </div>
              <div className="rounded-2xl border border-green-900 bg-black/20 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-green-600">Visible rows</p>
                <p className="mt-2 text-2xl font-black text-green-300">{filteredItems.length}</p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-rose-200">Suspicious</p>
                <p className="mt-2 text-2xl font-black text-rose-100">{suspiciousCount}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-500/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-green-900 bg-green-950/20 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-green-700" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search user, reference, item, action"
                className="w-full rounded-xl border border-green-900 bg-black/30 py-3 pl-10 pr-4 text-sm text-green-100 outline-none focus:border-green-700"
              />
            </label>

            <input
              value={userUid}
              onChange={(event) => setUserUid(event.target.value)}
              placeholder="Filter by user UID or 5-digit ID"
              className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700"
            />

            <select value={category} onChange={(event) => setCategory(event.target.value as "all" | ActivityCategory)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">All categories</option>
              <option value="economy">Economy</option>
              <option value="marketplace">Marketplace</option>
              <option value="inventory">Inventory</option>
              <option value="chests">Chest Opening</option>
              <option value="crafting">Crafting</option>
              <option value="admin">Admin</option>
              <option value="progression">Progression</option>
            </select>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">All actions</option>
              {actionTypeOptions.filter((option) => option !== "all").map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ActivityStatus)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">All status</option>
              <option value="completed">Completed</option>
              <option value="consumed">Consumed</option>
              <option value="admin_action">Admin Action</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="system">System</option>
            </select>

            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-700 bg-green-950 px-4 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Apply
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-green-600">
              <TableProperties className="h-4 w-4" />
              Admin spreadsheet mode
            </div>
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Failed and rejected rows are highlighted by status badge
            </div>
          </div>

          <div className="mt-5">
            <ActivityLogTable items={filteredItems} loadingMore={loadingMore} emptyLabel="No admin logs matched the current filters." showUserColumn />
          </div>

          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
              {nextCursor ? "Scroll to load more rows" : "No more rows"}
            </span>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Back to admin
          </Link>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900">
            <Shield className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
