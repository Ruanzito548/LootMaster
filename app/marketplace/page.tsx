"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { MARKETPLACE_MIN_PRICE } from "@/lib/rpg-system";
import { type InventoryItem } from "@/lib/profile-data";

type Listing = {
  id: string;
  sellerUid: string;
  sellerName: string;
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rarity: string;
  status: "active" | "sold" | "cancelled";
  createdAtMs: number;
};

type SaleHistory = {
  id: string;
  listingId: string;
  sellerUid: string;
  buyerUid: string;
  item: InventoryItem;
  quantity: number;
  totalPrice: number;
  createdAtMs: number;
};

const rarityOrder: Record<string, number> = {
  poor: 1,
  common: 2,
  uncommon: 3,
  rare: 4,
  epic: 5,
  legendary: 6,
  artifact: 7,
  heirloom: 8,
};

const rarityBadge: Record<string, string> = {
  poor: "border-[#9d9d9d]/55 text-[#c5c5c5]",
  common: "border-[#dfe4ef]/55 text-[#eaf2ff]",
  uncommon: "border-[#1eff00]/60 text-[#b7ffb0]",
  rare: "border-[#0070dd]/60 text-[#98ceff]",
  epic: "border-[#a335ee]/60 text-[#ddb8ff]",
  legendary: "border-[#ff8000]/62 text-[#ffd6a2]",
  artifact: "border-[#e6cc80]/62 text-[#ffeeb8]",
  heirloom: "border-[#00ccff]/62 text-[#bbf3ff]",
};

function formatRelativeTime(inputMs: number): string {
  const diff = Math.max(0, Date.now() - inputMs);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MarketplacePage() {
  const { status, profile, user, reload } = useProfileSession();

  const [listings, setListings] = useState<Listing[]>([]);
  const [history, setHistory] = useState<SaleHistory[]>([]);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const loadMarketplace = async () => {
    if (!user) {
      return;
    }

    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/marketplace/listings", {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json()) as { listings?: Listing[]; salesHistory?: SaleHistory[]; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not load marketplace.");
        return;
      }

      setListings(Array.isArray(payload.listings) ? payload.listings : []);
      setHistory(Array.isArray(payload.salesHistory) ? payload.salesHistory : []);
    } catch {
      setError("Network error while loading marketplace.");
    }
  };

  useEffect(() => {
    void loadMarketplace();
  }, [user]);

  const filtered = useMemo(() => {
    let next = [...listings];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      next = next.filter((entry) => entry.item.name.toLowerCase().includes(term));
    }

    if (rarityFilter !== "all") {
      next = next.filter((entry) => entry.rarity === rarityFilter);
    }

    if (minPrice > 0) {
      next = next.filter((entry) => entry.unitPrice >= minPrice);
    }

    if (maxPrice > 0) {
      next = next.filter((entry) => entry.unitPrice <= maxPrice);
    }

    next.sort((a, b) => {
      if (sortMode === "price-asc") {
        return a.unitPrice - b.unitPrice;
      }
      if (sortMode === "price-desc") {
        return b.unitPrice - a.unitPrice;
      }
      if (sortMode === "rarity") {
        return (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0);
      }
      return b.createdAtMs - a.createdAtMs;
    });

    return next;
  }, [listings, maxPrice, minPrice, rarityFilter, search, sortMode]);

  const mostSold = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();

    for (const sale of history) {
      const key = sale.item.id;
      const current = map.get(key) ?? { name: sale.item.name, count: 0 };
      map.set(key, { name: current.name, count: current.count + sale.quantity });
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [history]);

  const buyListing = async (listingId: string) => {
    if (!user || busyListingId) {
      return;
    }

    setBusyListingId(listingId);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not buy listing.");
        return;
      }

      await loadMarketplace();
      reload();
    } catch {
      setError("Network error while buying listing.");
    } finally {
      setBusyListingId(null);
    }
  };

  const cancelListing = async (listingId: string) => {
    if (!user || busyListingId) {
      return;
    }

    setBusyListingId(listingId);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/marketplace/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not remove listing.");
        return;
      }

      await loadMarketplace();
      reload();
    } catch {
      setError("Network error while removing listing.");
    } finally {
      setBusyListingId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <div className="h-8 w-64 animate-pulse rounded-xl bg-white/10" />
            <div className="mt-5 h-24 animate-pulse rounded-xl bg-white/10" />
          </section>
        </main>
      </div>
    );
  }

  if (status !== "authenticated" || !profile || !user) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Sign in to use the marketplace.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Sign in
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell relative overflow-hidden pb-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#5cd3ff]/11 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#ff9f66]/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2rem] border border-white/16 p-6 sm:p-8">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#98d9ff]">Auction House</p>
          <h1 className="mt-3 font-throne text-4xl font-black leading-[0.95] text-white sm:text-6xl">MARKETPLACE</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#bed4ee] sm:text-base">
            Buy, sell and track item flow in a premium MMO-style trading hub. Listing minimum price is {MARKETPLACE_MIN_PRICE} coins.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Your Coins</p>
              <p className="mt-2 text-2xl font-black text-[#ffd06d]">{profile.lootCoins.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Active Listings</p>
              <p className="mt-2 text-2xl font-black text-white">{listings.length}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Recent Sales</p>
              <p className="mt-2 text-2xl font-black text-white">{history.length}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Your Volume</p>
              <p className="mt-2 text-2xl font-black text-white">{(profile.marketplaceVolume ?? 0).toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </section>

        <section className="loot-panel rounded-[2rem] border border-white/14 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item"
              className="rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#7dd2ff]"
            />
            <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)} className="rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#7dd2ff]">
              <option value="all">All rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="artifact">Artifact</option>
            </select>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#7dd2ff]">
              <option value="recent">Most recent</option>
              <option value="price-asc">Price low-high</option>
              <option value="price-desc">Price high-low</option>
              <option value="rarity">Rarity</option>
            </select>
            <input
              type="number"
              value={minPrice || ""}
              onChange={(event) => setMinPrice(Number(event.target.value) || 0)}
              placeholder="Min price"
              className="rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#7dd2ff]"
            />
            <input
              type="number"
              value={maxPrice || ""}
              onChange={(event) => setMaxPrice(Number(event.target.value) || 0)}
              placeholder="Max price"
              className="rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#7dd2ff]"
            />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-rose-300/35 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {error}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="loot-panel rounded-[2rem] border border-white/14 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-throne text-3xl font-black text-white">Live Listings</h2>
              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#d6e8ff]">{filtered.length} entries</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {filtered.map((listing) => {
                const isOwner = listing.sellerUid === profile.uid;

                return (
                  <motion.article key={listing.id} className="relative overflow-hidden rounded-2xl border border-white/14 bg-black/25 p-4" whileHover={{ y: -3 }}>
                    <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(255,255,255,0.08),transparent_38%,transparent_75%,rgba(255,255,255,0.06))]" />
                    <div className="relative flex items-start gap-3">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/14 bg-black/30">
                        <Image src={listing.item.iconPath || "/itens/general/ticket.png"} alt={listing.item.name} fill className="object-contain p-2" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-black text-white">{listing.item.name}</p>
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#a7c3e2]">Seller: {listing.sellerName}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.13em] ${rarityBadge[listing.rarity] ?? "border-white/25 text-white"}`}>{listing.rarity}</span>
                          <span className="rounded-full border border-white/14 bg-white/6 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.13em] text-[#d7e8ff]">x{listing.quantity}</span>
                          <span className="rounded-full border border-white/14 bg-white/6 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.13em] text-[#d7e8ff]">{formatRelativeTime(listing.createdAtMs)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-4 grid grid-cols-2 gap-2 text-[0.64rem] font-bold uppercase tracking-[0.13em] text-[#b8d0eb]">
                      <span className="rounded-lg border border-white/12 bg-black/28 px-2 py-1">Unit: {listing.unitPrice}</span>
                      <span className="rounded-lg border border-white/12 bg-black/28 px-2 py-1">Total: {listing.totalPrice}</span>
                    </div>

                    <div className="relative mt-4 flex gap-2">
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => void cancelListing(listing.id)}
                          disabled={busyListingId !== null}
                          className="loot-secondary-button flex-1 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.13em] disabled:cursor-not-allowed"
                        >
                          {busyListingId === listing.id ? "Removing..." : "Remove listing"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void buyListing(listing.id)}
                          disabled={busyListingId !== null || profile.lootCoins < listing.totalPrice}
                          className="loot-gold-button flex-1 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.13em] disabled:cursor-not-allowed"
                        >
                          {busyListingId === listing.id ? "Buying..." : "Buy now"}
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </article>

          <article className="space-y-5">
            <section className="loot-panel rounded-[2rem] border border-white/14 p-5 sm:p-6">
              <h3 className="text-2xl font-black text-white">Most Sold</h3>
              <div className="mt-4 space-y-2">
                {mostSold.length > 0 ? (
                  mostSold.map((entry) => (
                    <div key={entry.name} className="rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm font-semibold text-[#d5e5f8]">
                      {entry.name} <span className="text-[#9bc9f3]">x{entry.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#a8bedb]">No sales recorded yet.</p>
                )}
              </div>
            </section>

            <section className="loot-panel rounded-[2rem] border border-white/14 p-5 sm:p-6">
              <h3 className="text-2xl font-black text-white">Recent Sales</h3>
              <div className="mt-4 space-y-2">
                {history.slice(0, 8).map((sale) => (
                  <div key={sale.id} className="rounded-xl border border-white/12 bg-black/25 px-3 py-2">
                    <p className="text-sm font-black text-white">{sale.item.name}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#aac6e4]">
                      x{sale.quantity} • {sale.totalPrice} • {formatRelativeTime(sale.createdAtMs)}
                    </p>
                  </div>
                ))}
                {history.length === 0 ? <p className="text-sm text-[#a8bedb]">No recent sales.</p> : null}
              </div>
            </section>
          </article>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
            Back to Inventory
          </Link>
          <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
            Rewards
          </Link>
        </div>
      </main>

      <AnimatePresence>
        {busyListingId ? (
          <motion.div className="fixed bottom-4 right-4 z-[220] rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d9ebff]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            Processing transaction...
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
