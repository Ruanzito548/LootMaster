"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ChestOpeningAnimation } from "@/app/components/chests/ChestOpeningAnimation";
import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_DEFINITIONS, CHEST_IDS, type ChestId } from "@/lib/chests";
import { type InventoryItem } from "@/lib/profile-data";
import { CRAFT_RECIPES, MARKETPLACE_MIN_PRICE, calculateMarketplaceFee, calculateMarketplaceReceive, getXpIntoCurrentLevel } from "@/lib/rpg-system";

type OpenChestApiResponse = {
  ok: true;
  replayed: boolean;
  chestId: ChestId;
  reward: {
    type: "coins" | "item" | "chest" | "cosmetic";
    title: string;
    rarity: string;
    amount?: number;
  };
  xpGain: number;
  rpgXp: number;
  rpgLevel: number;
  inventorySlotLimit: number;
};

type CraftRecipe = (typeof CRAFT_RECIPES)[number];

type ToastState = {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
};

type ChestMenuState = {
  item: InventoryItem;
  chestId: ChestId;
};

const RARITY_ORDER: Record<string, number> = {
  poor: 1,
  common: 2,
  uncommon: 3,
  rare: 4,
  epic: 5,
  legendary: 6,
  artifact: 7,
  heirloom: 8,
};

const RARITY_LABEL: Record<string, string> = {
  poor: "Poor",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  artifact: "Artifact",
  heirloom: "Heirloom",
};

const RARITY_GLOW: Record<string, string> = {
  poor: "shadow-[0_0_18px_rgba(157,157,157,0.35)] border-[#9d9d9d]/55",
  common: "shadow-[0_0_18px_rgba(223,228,239,0.35)] border-[#dfe4ef]/55",
  uncommon: "shadow-[0_0_18px_rgba(30,255,0,0.35)] border-[#1eff00]/60",
  rare: "shadow-[0_0_22px_rgba(0,112,221,0.4)] border-[#0070dd]/60",
  epic: "shadow-[0_0_24px_rgba(163,53,238,0.42)] border-[#a335ee]/60",
  legendary: "shadow-[0_0_26px_rgba(255,128,0,0.45)] border-[#ff8000]/62",
  artifact: "shadow-[0_0_28px_rgba(230,204,128,0.45)] border-[#e6cc80]/62",
  heirloom: "shadow-[0_0_26px_rgba(0,204,255,0.45)] border-[#00ccff]/62",
};

const DROP_HINT_BY_RARITY: Record<string, string> = {
  common: "Common+, low chance Rare",
  rare: "Rare+ chance, possible Epic",
  epic: "Epic+ chance, possible Legendary",
  legendary: "Legendary-heavy, Artifact chance",
  mythic: "Mythic table with premium outcomes",
};

function getChestIdByInventoryItem(item: InventoryItem): ChestId | null {
  const normalized = item.id.trim().toLowerCase();

  for (const chestId of CHEST_IDS) {
    const definition = CHEST_DEFINITIONS[chestId];
    if (definition.inventoryItemId === normalized || definition.inventoryItemName.toLowerCase() === item.name.toLowerCase()) {
      return chestId;
    }
  }

  return null;
}

function toMarketValue(item: InventoryItem): number {
  const base: Record<string, number> = {
    poor: 30,
    common: 85,
    uncommon: 160,
    rare: 420,
    epic: 950,
    legendary: 1800,
    artifact: 2800,
    heirloom: 2400,
  };

  return (base[item.rarity] ?? 60) * Math.max(1, item.quantity);
}

function isChestItem(item: InventoryItem): boolean {
  return item.category.toLowerCase() === "chest" || item.id.startsWith("chest-");
}

function sortInventory(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    const rarityDelta = (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
    if (rarityDelta !== 0) {
      return rarityDelta;
    }

    const categoryDelta = a.category.localeCompare(b.category);
    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    return a.name.localeCompare(b.name);
  });
}

export default function InventoryPage() {
  const { status, profile, user, reload } = useProfileSession();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
  const [chestMenu, setChestMenu] = useState<ChestMenuState | null>(null);

  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showCraftModal, setShowCraftModal] = useState(false);

  const [listingPrice, setListingPrice] = useState(1000);
  const [listingQuantity, setListingQuantity] = useState(1);
  const [marketBusy, setMarketBusy] = useState(false);

  const [craftRecipes, setCraftRecipes] = useState<CraftRecipe[]>(CRAFT_RECIPES);
  const [craftBusyId, setCraftBusyId] = useState<string | null>(null);

  const [isOpening, setIsOpening] = useState(false);
  const [openSequence, setOpenSequence] = useState(0);
  const [openingChestId, setOpeningChestId] = useState<ChestId | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<OpenChestApiResponse | null>(null);
  const [lastReveal, setLastReveal] = useState<{ title: string; rarity: string; type: string; xpGain: number } | null>(null);

  const inventory = useMemo(() => sortInventory(profile?.inventory ?? []), [profile?.inventory]);
  const slotLimit = Math.max(20, profile?.inventorySlotLimit ?? 20);
  const usedSlots = inventory.length;
  const fillPercent = Math.min(100, (usedSlots / slotLimit) * 100);

  const rpgXp = profile?.rpgXp ?? 0;
  const rpgLevel = Math.max(1, profile?.rpgLevel ?? 1);
  const xpSegment = getXpIntoCurrentLevel(rpgXp);

  const selectedMarketItem = chestMenu?.item ?? null;

  const pushToast = useCallback((kind: ToastState["kind"], text: string) => {
    setToast({ id: Date.now(), kind, text });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadRecipes = async () => {
      if (!user) {
        return;
      }

      try {
        const response = await fetch("/api/profile/crafting/recipes", { cache: "no-store" });
        const payload = (await response.json()) as { recipes?: CraftRecipe[] };
        if (!cancelled && response.ok && Array.isArray(payload.recipes)) {
          setCraftRecipes(payload.recipes);
        }
      } catch {
        if (!cancelled) {
          setCraftRecipes(CRAFT_RECIPES);
        }
      }
    };

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const resetOpenFlow = useCallback(() => {
    setIsOpening(false);
    setOpeningChestId(null);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);
  }, []);

  const finalizeOpen = useCallback(() => {
    if (requestError) {
      pushToast("error", requestError);
    } else if (pendingResult?.ok) {
      setLastReveal({
        title: pendingResult.reward.title,
        rarity: pendingResult.reward.rarity,
        type: pendingResult.reward.type,
        xpGain: pendingResult.xpGain,
      });
      pushToast("success", `${pendingResult.reward.title} unlocked.`);
      reload();
    }

    resetOpenFlow();
  }, [pendingResult, pushToast, reload, requestError, resetOpenFlow]);

  useEffect(() => {
    if (isOpening && animationDone && requestDone) {
      finalizeOpen();
    }
  }, [animationDone, finalizeOpen, isOpening, requestDone]);

  const openChestFromInventory = async (targetItem: InventoryItem, chestId: ChestId) => {
    if (!user || isOpening) {
      return;
    }

    if (targetItem.quantity <= 0) {
      pushToast("error", "No chest quantity available.");
      return;
    }

    setChestMenu(null);
    setOpeningChestId(chestId);
    setOpenSequence((current) => current + 1);
    setIsOpening(true);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);

    try {
      const token = await user.getIdToken();
      const requestId = crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "");

      const response = await fetch("/api/rewards/chests/open", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chestId, requestId }),
      });

      const payload = (await response.json()) as OpenChestApiResponse | { error?: string };

      if (!response.ok || !("ok" in payload)) {
        setRequestError("error" in payload && payload.error ? payload.error : "Could not open chest.");
      } else {
        setPendingResult(payload);
      }
    } catch {
      setRequestError("Network error while opening chest.");
    } finally {
      setRequestDone(true);
    }
  };

  const createListing = async () => {
    if (!selectedMarketItem || !user || marketBusy) {
      return;
    }

    if (listingPrice < MARKETPLACE_MIN_PRICE) {
      pushToast("error", `Minimum price is ${MARKETPLACE_MIN_PRICE}.`);
      return;
    }

    if (listingQuantity < 1 || listingQuantity > selectedMarketItem.quantity) {
      pushToast("error", "Invalid quantity.");
      return;
    }

    setMarketBusy(true);

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: selectedMarketItem.id,
          quantity: listingQuantity,
          unitPrice: listingPrice,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        pushToast("error", payload.error ?? "Could not create listing.");
        return;
      }

      pushToast("success", `${selectedMarketItem.name} listed on marketplace.`);
      setShowMarketModal(false);
      setChestMenu(null);
      reload();
    } catch {
      pushToast("error", "Could not list item right now.");
    } finally {
      setMarketBusy(false);
    }
  };

  const craftRecipe = async (recipeId: string) => {
    if (!user || craftBusyId) {
      return;
    }

    setCraftBusyId(recipeId);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile/crafting/craft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeId, quantity: 1 }),
      });

      const payload = (await response.json()) as { error?: string; recipeTitle?: string; xpGain?: number };

      if (!response.ok) {
        pushToast("error", payload.error ?? "Craft failed.");
        return;
      }

      pushToast("success", `Craft complete: ${payload.recipeTitle ?? "item"} (+${payload.xpGain ?? 0} XP)`);
      reload();
    } catch {
      pushToast("error", "Craft service unavailable.");
    } finally {
      setCraftBusyId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <div className="h-7 w-44 animate-pulse rounded-md bg-white/10" />
            <div className="mt-4 h-16 w-full max-w-2xl animate-pulse rounded-xl bg-white/10" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
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
            <p className="loot-muted mt-3 text-sm">Sign in to access your RPG inventory.</p>
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
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#4bcfff]/12 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#b16bff]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-[#ff9a4a]/8 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel relative overflow-hidden rounded-[2rem] border border-white/15 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_35%,transparent_72%,rgba(255,255,255,0.06))]" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-[#9adfff]">Inventory Core</p>
              <h1 className="font-throne text-4xl font-black leading-[0.95] text-white sm:text-6xl">MMO VAULT HUB</h1>
              <p className="text-sm leading-7 text-[#bfd4ec] sm:text-base">
                Chests, crafting and marketplace are now integrated directly into your inventory for a single premium gameplay loop.
              </p>
            </div>

            <div className="grid min-w-[220px] gap-2 rounded-2xl border border-white/14 bg-black/25 p-4">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#99b6d7]">Wallet</p>
              <p className="text-3xl font-black text-[#ffcf67]">{profile.lootCoins.toLocaleString("pt-BR")}</p>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#99b6d7]">Title</p>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#d8e9ff]">Level {rpgLevel}</p>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Inventory Slots</p>
              <p className="mt-2 text-2xl font-black text-white">{usedSlots}/{slotLimit}</p>
            </article>
            <article className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">RPG XP</p>
              <p className="mt-2 text-2xl font-black text-white">{rpgXp}</p>
            </article>
            <article className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">XP Progress</p>
              <p className="mt-2 text-2xl font-black text-white">{xpSegment.inLevel}/{xpSegment.levelCap}</p>
            </article>
            <article className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Sales</p>
              <p className="mt-2 text-2xl font-black text-white">{profile.marketplaceSales ?? 0}</p>
            </article>
            <article className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Buys</p>
              <p className="mt-2 text-2xl font-black text-white">{profile.marketplaceBuys ?? 0}</p>
            </article>
          </div>

          <div className="relative mt-4 h-3 overflow-hidden rounded-full border border-white/15 bg-black/40">
            <motion.div className="h-full bg-gradient-to-r from-[#59cfff] via-[#4f8cff] to-[#c06dff]" animate={{ width: `${fillPercent}%` }} transition={{ duration: 0.45 }} />
          </div>

          <div className="relative mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCraftModal(true)}
              className="loot-gold-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]"
            >
              Craft
            </button>
            <Link href="/marketplace" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
              Marketplace
            </Link>
            <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
              Back to Profile
            </Link>
          </div>
        </section>

        <section className="loot-panel rounded-[2rem] border border-white/14 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-throne text-3xl font-black text-white">Inventory Grid</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#a6c0df]">Click chest items for contextual actions</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.15em] ${usedSlots >= slotLimit ? "border-rose-300/45 bg-rose-500/15 text-rose-100" : "border-emerald-300/45 bg-emerald-500/15 text-emerald-100"}`}>
              {usedSlots >= slotLimit ? "Inventory Full" : "Space Available"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: slotLimit }).map((_, slotIndex) => {
              const item = inventory[slotIndex] ?? null;

              if (!item) {
                return <div key={`slot-empty-${slotIndex}`} className="aspect-square rounded-xl border border-dashed border-white/12 bg-black/35" />;
              }

              const rarityClass = RARITY_GLOW[item.rarity] ?? "border-white/25";
              const itemIsChest = isChestItem(item);

              return (
                <motion.button
                  key={`${item.id}-${slotIndex}`}
                  type="button"
                  className={`group relative aspect-square overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(9,16,29,0.96),rgba(5,10,20,0.94))] p-2 text-left transition-all ${rarityClass} ${itemIsChest ? "cursor-pointer" : "cursor-default"}`}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem((current) => (current?.id === item.id ? null : current))}
                  onClick={() => {
                    if (!itemIsChest) {
                      return;
                    }

                    const chestId = getChestIdByInventoryItem(item);
                    if (!chestId) {
                      pushToast("error", "This chest is not mapped in chest definitions.");
                      return;
                    }

                    setChestMenu({ item, chestId });
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(255,255,255,0.16),transparent_60%)]" />
                  <Image src={item.iconPath || "/itens/general/ticket.png"} alt={item.name} width={88} height={88} className="relative mx-auto h-[70%] w-[70%] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]" />
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                    <span className="truncate rounded bg-black/55 px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-[#d7e7ff]">{item.name}</span>
                    <span className="rounded bg-black/65 px-1.5 py-0.5 text-[0.56rem] font-black text-white">{item.quantity}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {lastReveal ? (
          <motion.section className="rounded-2xl border border-white/16 bg-black/30 p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9cd9ff]">Latest Chest Reveal</p>
            <h3 className="mt-2 text-2xl font-black text-white">{lastReveal.title}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#b6cbe7]">{lastReveal.type} • {lastReveal.rarity} • +{lastReveal.xpGain} XP</p>
          </motion.section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
            Rewards Hub
          </Link>
          <Link href="/marketplace" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">
            Auction House
          </Link>
        </div>
      </main>

      <AnimatePresence>
        {hoveredItem ? (
          <motion.aside
            className="pointer-events-none fixed bottom-4 left-4 z-[120] w-[min(94vw,360px)] rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(12,20,34,0.96),rgba(6,12,24,0.96))] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.48)] backdrop-blur"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#9fc5e7]">{hoveredItem.category}</p>
            <h3 className="mt-1 text-xl font-black text-white">{hoveredItem.name}</h3>
            <p className="mt-2 text-sm text-[#bdd3eb]">{hoveredItem.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[0.63rem] font-bold uppercase tracking-[0.12em]">
              <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[#dceaff]">Rarity: {RARITY_LABEL[hoveredItem.rarity] ?? hoveredItem.rarity}</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[#dceaff]">Qty: {hoveredItem.quantity}</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[#dceaff]">Market: {toMarketValue(hoveredItem)}</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[#dceaff]">Drop: {DROP_HINT_BY_RARITY[hoveredItem.rarity] ?? "Unknown"}</span>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {chestMenu ? (
          <motion.div className="fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/55 backdrop-blur-[4px]" onClick={() => setChestMenu(null)} />

            <motion.section
              className="absolute bottom-4 left-1/2 w-[min(94vw,460px)] -translate-x-1/2 rounded-3xl border border-white/16 bg-[linear-gradient(180deg,rgba(12,21,37,0.98),rgba(7,13,24,0.98))] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.58)]"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
            >
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9ad8ff]">Chest Actions</p>
              <h3 className="mt-2 text-2xl font-black text-white">{chestMenu.item.name}</h3>
              <p className="mt-2 text-sm text-[#c4d8f1]">Select an action for this chest item. All actions are synced to your profile.</p>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  className="loot-gold-button w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  onClick={() => void openChestFromInventory(chestMenu.item, chestMenu.chestId)}
                >
                  Open Chest
                </button>
                <button
                  type="button"
                  className="loot-secondary-button w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  onClick={() => {
                    setShowMarketModal(true);
                    setListingPrice(Math.max(MARKETPLACE_MIN_PRICE, Math.round(toMarketValue(chestMenu.item) / Math.max(1, chestMenu.item.quantity))));
                    setListingQuantity(1);
                  }}
                >
                  Sell on Marketplace
                </button>
                <button
                  type="button"
                  className="loot-secondary-button w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  onClick={() => setShowRewardsModal(true)}
                >
                  View Possible Rewards
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showMarketModal && selectedMarketItem ? (
          <motion.div className="fixed inset-0 z-[170]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" onClick={() => setShowMarketModal(false)} aria-label="Close marketplace modal" />

            <motion.section className="absolute left-1/2 top-1/2 w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/18 bg-[linear-gradient(180deg,rgba(11,22,38,0.98),rgba(7,13,22,0.98))] p-6" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#9ad6ff]">Create Listing</p>
              <h3 className="mt-2 text-2xl font-black text-white">{selectedMarketItem.name}</h3>

              <div className="mt-4 rounded-2xl border border-white/12 bg-black/28 p-3 text-sm text-[#c2d7ee]">
                <p>Rarity: {RARITY_LABEL[selectedMarketItem.rarity] ?? selectedMarketItem.rarity}</p>
                <p className="mt-1">Available: {selectedMarketItem.quantity}</p>
                <p className="mt-1">Suggested: {Math.round(toMarketValue(selectedMarketItem) / Math.max(1, selectedMarketItem.quantity))}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-[#cde1f8]">
                  Quantity
                  <input type="number" min={1} max={selectedMarketItem.quantity} value={listingQuantity} onChange={(event) => setListingQuantity(Math.max(1, Math.min(selectedMarketItem.quantity, Number(event.target.value) || 1)))} className="rounded-xl border border-white/16 bg-black/35 px-3 py-2 outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[#cde1f8]">
                  Price per unit
                  <input type="number" min={MARKETPLACE_MIN_PRICE} value={listingPrice} onChange={(event) => setListingPrice(Math.max(MARKETPLACE_MIN_PRICE, Number(event.target.value) || MARKETPLACE_MIN_PRICE))} className="rounded-xl border border-white/16 bg-black/35 px-3 py-2 outline-none" />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-white/12 bg-black/25 p-3 text-sm text-[#d4e6fa]">
                <p>Gross: {(listingPrice * listingQuantity).toLocaleString("pt-BR")}</p>
                <p>Marketplace Fee (5%): {calculateMarketplaceFee(listingPrice * listingQuantity).toLocaleString("pt-BR")}</p>
                <p>You Receive: {calculateMarketplaceReceive(listingPrice * listingQuantity).toLocaleString("pt-BR")}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={createListing} disabled={marketBusy} className="loot-gold-button flex-1 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed">
                  {marketBusy ? "Listing..." : "Confirm Listing"}
                </button>
                <button type="button" onClick={() => setShowMarketModal(false)} className="loot-secondary-button rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em]">
                  Cancel
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showRewardsModal && chestMenu ? (
          <motion.div className="fixed inset-0 z-[168]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setShowRewardsModal(false)} aria-label="Close rewards modal" />
            <motion.section className="absolute left-1/2 top-1/2 w-[min(94vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/18 bg-[linear-gradient(180deg,rgba(12,22,38,0.98),rgba(6,12,20,0.98))] p-6" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#9ad6ff]">Possible Rewards</p>
              <h3 className="mt-2 text-2xl font-black text-white">{CHEST_DEFINITIONS[chestMenu.chestId].title}</h3>

              <div className="mt-4 grid gap-2">
                {CHEST_DEFINITIONS[chestMenu.chestId].rewardOdds.map((entry) => (
                  <div key={entry.type} className="rounded-xl border border-white/12 bg-black/25 p-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-[#c7daf0]">
                      <span>{entry.type}</span>
                      <span>{entry.weight}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[#54cbff] to-[#a26cff]" initial={{ width: 0 }} animate={{ width: `${Math.max(4, entry.weight)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9fbad8]">{DROP_HINT_BY_RARITY[CHEST_DEFINITIONS[chestMenu.chestId].rarity] ?? "Dynamic drop table"}</p>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCraftModal ? (
          <motion.div className="fixed inset-0 z-[165]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[5px]" onClick={() => setShowCraftModal(false)} aria-label="Close craft modal" />

            <motion.section className="absolute left-1/2 top-1/2 max-h-[86vh] w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/16 bg-[linear-gradient(180deg,rgba(12,22,36,0.98),rgba(7,13,24,0.98))] p-6" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#9ad6ff]">Crafting Forge</p>
              <h3 className="mt-2 text-3xl font-black text-white">Create Chests and Upgrades</h3>
              <p className="mt-2 text-sm text-[#b9d1ea]">Crafting grants XP and supports rune-based rarity progression.</p>

              <div className="mt-5 grid gap-3">
                {craftRecipes.map((recipe) => (
                  <article key={recipe.id} className="rounded-2xl border border-white/14 bg-black/25 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#9ed6ff]">{recipe.outputType}</p>
                        <h4 className="mt-1 text-xl font-black text-white">{recipe.title}</h4>
                        <p className="mt-2 text-sm text-[#bed4ec]">{recipe.description}</p>
                      </div>
                      <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#d5e7fb]">+{recipe.xpGain} XP</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.materials.map((material) => {
                        const owned = inventory.find((item) => item.id === material.itemId)?.quantity ?? 0;
                        const enough = owned >= material.quantity;

                        return (
                          <span key={`${recipe.id}-${material.itemId}`} className={`rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.13em] ${enough ? "border-emerald-300/38 bg-emerald-500/14 text-emerald-100" : "border-rose-300/38 bg-rose-500/14 text-rose-100"}`}>
                            {material.name} {owned}/{material.quantity}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => void craftRecipe(recipe.id)}
                      disabled={craftBusyId !== null}
                      className="loot-gold-button mt-4 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
                    >
                      {craftBusyId === recipe.id ? "Crafting..." : `Craft ${recipe.outputItem.name}`}
                    </button>
                  </article>
                ))}
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div className="fixed right-4 top-4 z-[220] w-[min(92vw,420px)]" initial={{ opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${toast.kind === "success" ? "border-emerald-300/35 bg-emerald-500/16 text-emerald-100" : toast.kind === "error" ? "border-rose-300/35 bg-rose-500/16 text-rose-100" : "border-sky-300/35 bg-sky-500/16 text-sky-100"}`}>
              {toast.text}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ChestOpeningAnimation
        isOpen={isOpening}
        openSequence={openSequence}
        onComplete={() => setAnimationDone(true)}
        chestRarity={openingChestId ? CHEST_DEFINITIONS[openingChestId].rarity : undefined}
        chestTitle={openingChestId ? CHEST_DEFINITIONS[openingChestId].title : undefined}
      />
    </div>
  );
}
