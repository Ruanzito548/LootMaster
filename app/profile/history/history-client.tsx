"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Coins,
  Crown,
  Flame,
  Hammer,
  Package,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Store,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import type { ActivityCategory, ActivityHistoryLog, ActivityStatus } from "@/lib/activity-history-types";

import { useProfileSession } from "../use-profile-session";

const PAGE_SIZE = 20;

const categoryOptions: Array<{ value: "all" | ActivityCategory; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "economy", label: "Economy" },
  { value: "marketplace", label: "Marketplace" },
  { value: "inventory", label: "Inventory" },
  { value: "chests", label: "Chests" },
  { value: "crafting", label: "Crafting" },
  { value: "admin", label: "Admin" },
  { value: "progression", label: "Progression" },
];

const statusOptions: Array<{ value: "all" | ActivityStatus; label: string }> = [
  { value: "all", label: "All status" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
  { value: "system", label: "System" },
];

const rarityGlow: Record<string, string> = {
  mythic: "border-red-500/40 bg-red-500/12 text-red-100 shadow-[0_0_35px_rgba(255,64,64,0.2)]",
  legendary: "border-amber-400/40 bg-amber-400/12 text-amber-100 shadow-[0_0_30px_rgba(255,194,77,0.18)]",
  epic: "border-fuchsia-400/40 bg-fuchsia-500/12 text-fuchsia-100 shadow-[0_0_28px_rgba(205,89,255,0.18)]",
  rare: "border-sky-400/40 bg-sky-500/12 text-sky-100 shadow-[0_0_26px_rgba(89,190,255,0.18)]",
  uncommon: "border-emerald-400/40 bg-emerald-500/12 text-emerald-100",
  common: "border-slate-300/20 bg-slate-200/10 text-slate-100",
  poor: "border-stone-300/15 bg-stone-200/10 text-stone-100",
  artifact: "border-orange-400/40 bg-orange-500/12 text-orange-100 shadow-[0_0_30px_rgba(255,126,43,0.18)]",
  heirloom: "border-cyan-300/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_28px_rgba(80,230,255,0.2)]",
};

function getCategoryIcon(category: ActivityCategory) {
  if (category === "economy") return Coins;
  if (category === "marketplace") return Store;
  if (category === "inventory") return Package;
  if (category === "chests") return Sparkles;
  if (category === "crafting") return Hammer;
  if (category === "admin") return Shield;
  return Crown;
}

function formatCurrency(value: number, unit: ActivityHistoryLog["valueUnit"]) {
  if (unit === "usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  if (unit === "brl") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  if (unit === "xp") {
    return `${value.toFixed(2)} XP`;
  }

  if (unit === "item") {
    return value.toLocaleString("en-US");
  }

  return `${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Loot`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatLabel(input: string) {
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSearchTarget(item: ActivityHistoryLog) {
  return [
    item.description,
    item.itemName,
    item.itemCategory,
    item.relatedUserName,
    item.origin,
    item.actionType,
    item.rarity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function getAuthorizationHeader() {
  const token = await auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
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
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest-value">("newest");
  const [toast, setToast] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  async function fetchPage(cursor?: string | null) {
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
      throw new Error(payload.error ?? "Could not load activity history.");
    }

    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
    };
  }

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
        const page = await fetchPage();
        if (cancelled) {
          return;
        }

        seenIdsRef.current = new Set(page.items.map((item) => item.id));
        setItems(page.items);
        setNextCursor(page.nextCursor);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load activity history.");
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

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const page = await fetchPage();
          const freshItems = page.items.filter((item) => !seenIdsRef.current.has(item.id));
          if (freshItems.length === 0) {
            return;
          }

          startTransition(() => {
            setItems((current) => {
              const next = [...freshItems, ...current];
              const unique = Array.from(new Map(next.map((item) => [item.id, item])).values());
              seenIdsRef.current = new Set(unique.map((item) => item.id));
              return unique;
            });
            setToast(`${freshItems.length} new ${freshItems.length === 1 ? "activity" : "activities"} synced`);
          });
        } catch {
          return;
        }
      })();
    }, 25000);

    return () => window.clearInterval(interval);
  }, [profile, status]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || loadingMore || loading) {
      return;
    }

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        void (async () => {
          setLoadingMore(true);
          try {
            const page = await fetchPage(nextCursor);
            startTransition(() => {
              setItems((current) => {
                const next = [...current, ...page.items];
                const unique = Array.from(new Map(next.map((item) => [item.id, item])).values());
                seenIdsRef.current = new Set(unique.map((item) => item.id));
                return unique;
              });
              setNextCursor(page.nextCursor);
            });
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more activities.");
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

  const rarityOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.rarity).filter((value): value is string => Boolean(value))));
    return ["all", ...values];
  }, [items]);

  const actionTypeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.actionType)))];
  }, [items]);

  const [actionType, setActionType] = useState("all");

  const filteredItems = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let next = [...items];

    if (normalizedSearch) {
      next = next.filter((item) => normalizeSearchTarget(item).includes(normalizedSearch));
    }

    if (category !== "all") {
      next = next.filter((item) => item.category === category);
    }

    if (statusFilter !== "all") {
      next = next.filter((item) => item.status === statusFilter);
    }

    if (rarityFilter !== "all") {
      next = next.filter((item) => item.rarity === rarityFilter);
    }

    if (actionType !== "all") {
      next = next.filter((item) => item.actionType === actionType);
    }

    next.sort((left, right) => {
      if (sortBy === "oldest") {
        return left.createdAtMs - right.createdAtMs;
      }

      if (sortBy === "highest-value") {
        return (right.value ?? 0) - (left.value ?? 0);
      }

      return right.createdAtMs - left.createdAtMs;
    });

    return next;
  }, [actionType, category, deferredSearch, items, rarityFilter, sortBy, statusFilter]);

  const statCards = useMemo(() => {
    const economyCount = items.filter((item) => item.category === "economy").length;
    const marketCount = items.filter((item) => item.category === "marketplace").length;
    const rareDrops = items.filter((item) => ["rare", "epic", "legendary", "mythic", "artifact", "heirloom"].includes(item.rarity ?? "")).length;
    return [
      { label: "Loaded events", value: items.length, accent: "text-[#9fe0ff]", icon: ScrollText },
      { label: "Economy ops", value: economyCount, accent: "text-[#ffd76d]", icon: Coins },
      { label: "Market ops", value: marketCount, accent: "text-[#88ffc7]", icon: Store },
      { label: "Rare highlights", value: rareDrops, accent: "text-[#ff8ff5]", icon: Flame },
    ];
  }, [items]);

  if (status === "loading" || loading) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <div className="h-7 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-14 w-96 animate-pulse rounded-2xl bg-white/10" />
            <div className="mt-4 h-6 w-full max-w-3xl animate-pulse rounded-full bg-white/10" />
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="loot-panel rounded-[1.6rem] p-5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="mt-4 h-10 w-20 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </section>
          <section className="loot-panel rounded-[2rem] p-6">
            <div className="grid gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                  <div className="h-5 w-48 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
                </div>
              ))}
            </div>
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
            <p className="loot-muted mt-3 text-sm">Sign in to access your complete account history.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Go to login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-14 top-12 h-80 w-80 rounded-full bg-[#3ab7ff]/12 blur-3xl" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-[#ff9b37]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#ff4d7e]/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(10,20,34,0.94),rgba(5,10,19,0.88))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#9fdfff]">Account Activity</p>
              <h1 className="mt-3 text-4xl font-black leading-[0.96] text-white sm:text-6xl">/profile/history rebuilt as a real user log system</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#bad1eb] sm:text-base">
                Financial events, inventory movements, marketplace activity, chest openings, crafting, admin interventions and progression milestones now live together in one premium timeline.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/12 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-emerald-100">
                Live sync active
              </span>
              <span className="rounded-full border border-sky-300/20 bg-sky-500/12 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-sky-100">
                Immutable event trail
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.label} className="loot-panel rounded-[1.7rem] border border-white/12 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#99b6d7]">{card.label}</p>
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
              <p className={`mt-4 text-4xl font-black ${card.accent}`}>{card.value}</p>
            </article>
          ))}
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-300/30 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        <section className="loot-panel rounded-[2rem] border border-white/12 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-5">
            <label className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#86a9cf]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search action, item, origin or related user"
                className="w-full rounded-xl border border-white/12 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-[#7fd8ff]"
              />
            </label>

            <select value={category} onChange={(event) => setCategory(event.target.value as "all" | ActivityCategory)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7fd8ff]">
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select value={actionType} onChange={(event) => setActionType(event.target.value)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7fd8ff]">
              {actionTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All actions" : formatLabel(option)}
                </option>
              ))}
            </select>

            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "newest" | "oldest" | "highest-value")} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7fd8ff]">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest-value">Highest value</option>
            </select>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ActivityStatus)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7fd8ff]">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)} className="rounded-xl border border-white/12 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-[#7fd8ff]">
              {rarityOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All rarities" : formatLabel(option)}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm font-semibold text-[#c6d9ee]">
              {filteredItems.length} visible records
            </div>

            <div className="rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm font-semibold text-[#c6d9ee]">
              {nextCursor ? "Infinite loading ready" : "End of loaded history"}
            </div>
          </div>
        </section>

        <section className="loot-panel rounded-[2rem] border border-white/12 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Timeline</h2>
              <p className="mt-2 text-sm text-[#9fb7d2]">Every meaningful account action is recorded here with context, status, item data and value metadata.</p>
            </div>
            <Activity className="h-6 w-6 text-[#8fd9ff]" />
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-white/14 bg-black/20 p-8 text-center">
              <p className="text-lg font-black text-white">No entries matched the current filters.</p>
              <p className="mt-2 text-sm text-[#9fb7d2]">Try expanding the search or loading more history.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredItems.map((item, index) => {
                const Icon = getCategoryIcon(item.category);
                const rarityClass = item.rarity ? rarityGlow[item.rarity] ?? rarityGlow.common : "border-white/12 bg-white/5 text-white";

                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: Math.min(index * 0.015, 0.18) }}
                    className="group relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,20,31,0.94),rgba(7,12,22,0.88))] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-white/18"
                  >
                    <div className="absolute left-[1.65rem] top-0 bottom-0 hidden w-px bg-[linear-gradient(180deg,rgba(143,217,255,0.45),rgba(143,217,255,0.02))] md:block" />

                    <div className="relative flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-black/35 shadow-[0_0_24px_rgba(92,211,255,0.14)]">
                        <Icon className="h-5 w-5 text-[#95dcff]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.14em] text-sky-100">
                                {formatLabel(item.category)}
                              </span>
                              <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#dbe8f9]">
                                {formatLabel(item.status)}
                              </span>
                              {item.rarity ? (
                                <span className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.14em] ${rarityClass}`}>
                                  {formatLabel(item.rarity)}
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-xl font-black text-white sm:text-2xl">{item.description}</h3>

                            <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#9db7d5]">
                              <span>{formatRelativeTime(item.createdAt)}</span>
                              <span>{formatDate(item.createdAt)}</span>
                              <span>Origin: {item.origin}</span>
                              <span>Action: {formatLabel(item.actionType)}</span>
                            </div>
                          </div>

                          {typeof item.value === "number" && item.valueUnit ? (
                            <div className="rounded-2xl border border-amber-300/18 bg-amber-400/10 px-4 py-3 text-right shadow-[0_0_26px_rgba(255,194,77,0.08)]">
                              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#f4d383]">Value</p>
                              <p className="mt-1 text-lg font-black text-[#ffe09a]">{formatCurrency(item.value, item.valueUnit)}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8ea8c7]">Item</p>
                            <p className="mt-2 text-sm font-semibold text-white">{item.itemName ?? "--"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8ea8c7]">Quantity</p>
                            <p className="mt-2 text-sm font-semibold text-white">{item.quantity ?? "--"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8ea8c7]">Related user</p>
                            <p className="mt-2 text-sm font-semibold text-white">{item.relatedUserName ?? "--"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8ea8c7]">Reference</p>
                            <p className="mt-2 truncate text-sm font-semibold text-white">{item.metadata.orderId?.toString() ?? item.metadata.requestId?.toString() ?? item.id}</p>
                          </div>
                        </div>

                        {Object.keys(item.metadata).length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.entries(item.metadata)
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <span key={`${item.id}-${key}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.62rem] font-semibold text-[#d7e5f7]">
                                  {formatLabel(key)}: {String(value)}
                                </span>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          <div ref={loadMoreRef} className="mt-6 flex justify-center">
            {loadingMore ? (
              <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d8e9fb]">
                Loading more activity...
              </div>
            ) : nextCursor ? (
              <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#a9c6e5]">
                Scroll to load more
              </div>
            ) : (
              <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#8ea8c7]">
                No more loaded pages
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Open inventory
          </Link>
          <Link href="/profile/wallet-history" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Wallet statement
          </Link>
        </div>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 z-[220] rounded-2xl border border-emerald-300/24 bg-emerald-500/16 px-4 py-3 text-sm font-semibold text-emerald-50 shadow-[0_18px_40px_rgba(11,150,87,0.22)] backdrop-blur"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
