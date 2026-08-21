"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ChestOpeningAnimation } from "@/app/components/chests/ChestOpeningAnimation";
import { useProfileSession } from "@/app/profile/use-profile-session";
import { getLootOddsForPreview } from "@/lib/chest-loot";
import { CHEST_DEFINITIONS, CHEST_IDS, getChestImagePath, type ChestId } from "@/lib/chests";
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

type RedeemGiftcardResponse = {
  ok?: boolean;
  error?: string;
  claimId?: string;
  giftCardTitle?: string;
};

type CraftRecipe = (typeof CRAFT_RECIPES)[number];
type RecipeCategory = "gift-cards" | "chests";

type ChestConfigResponse = {
  ok: true;
  config: {
    byChest: Record<ChestId, { rewardOdds: Array<{ type: string; weight: number }> }>;
  };
};

type RewardOddsByChest = Record<ChestId, Array<{ type: string; weight: number }>>;

type ToastState = {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
};

type ChestMenuState = {
  item: InventoryItem;
  chestId: ChestId;
};

const DEFAULT_REWARD_ODDS_BY_CHEST: RewardOddsByChest = {
  common: getLootOddsForPreview("common"),
  uncommon: getLootOddsForPreview("uncommon"),
  rare: getLootOddsForPreview("rare"),
  epic: getLootOddsForPreview("epic"),
  legendary: getLootOddsForPreview("legendary"),
  mythic: getLootOddsForPreview("mythic"),
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
  poor: "shadow-[0_0_18px_rgba(120,125,132,0.32)] border-[#787d84]/55",
  common: "shadow-[0_0_18px_rgba(184,192,200,0.32)] border-[#b8c0c8]/55",
  uncommon: "shadow-[0_0_18px_rgba(47,163,107,0.35)] border-[#2fa36b]/60",
  rare: "shadow-[0_0_22px_rgba(45,110,199,0.4)] border-[#2d6ec7]/60",
  epic: "shadow-[0_0_24px_rgba(122,63,168,0.42)] border-[#7a3fa8]/60",
  legendary: "shadow-[0_0_26px_rgba(212,175,90,0.45)] border-[#d4af5a]/65",
  artifact: "shadow-[0_0_28px_rgba(163,58,58,0.45)] border-[#a33a3a]/65",
  heirloom: "shadow-[0_0_26px_rgba(142,152,163,0.4)] border-[#8e98a3]/60",
};

const RARITY_TEXT: Record<string, string> = {
  poor: "text-[#8e98a3]",
  common: "text-[#e2e6ea]",
  uncommon: "text-[#45c982]",
  rare: "text-[#5b9be6]",
  epic: "text-[#b98af0]",
  legendary: "text-[#e6c46a]",
  artifact: "text-[#e07a7a]",
  heirloom: "text-[#b8c0c8]",
};

const RARITY_BADGE: Record<string, string> = {
  poor: "bg-[#787d84]/20 text-[#c2c7cd] border-[#787d84]/45",
  common: "bg-[#b8c0c8]/20 text-[#f0f3f5] border-[#b8c0c8]/45",
  uncommon: "bg-[#2fa36b]/20 text-[#8bf0b2] border-[#2fa36b]/50",
  rare: "bg-[#2d6ec7]/22 text-[#8fc4ff] border-[#5b9be6]/55",
  epic: "bg-[#7a3fa8]/24 text-[#d6b2ff] border-[#b98af0]/55",
  legendary: "bg-[#d4af5a]/24 text-[#ffe39a] border-[#e6c46a]/60",
  artifact: "bg-[#a33a3a]/24 text-[#ffaaaa] border-[#e07a7a]/55",
  heirloom: "bg-[#8e98a3]/22 text-[#e2e6ea] border-[#b8c0c8]/55",
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

function isRedeemableGiftCard(item: InventoryItem): boolean {
  const category = item.category.trim().toLowerCase();
  const id = item.id.trim().toLowerCase();
  const name = item.name.trim().toLowerCase();

  if (category !== "gift card") {
    return false;
  }

  if (id === "gift-card-fragment" || name.includes("fragment")) {
    return false;
  }

  return item.quantity > 0;
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
  const [showCraftMenu, setShowCraftMenu] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [openCraftCategory, setOpenCraftCategory] = useState<RecipeCategory | null>("gift-cards");

  const [listingPrice, setListingPrice] = useState(1000);
  const [listingQuantity, setListingQuantity] = useState(1);
  const [marketBusy, setMarketBusy] = useState(false);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemItem, setRedeemItem] = useState<InventoryItem | null>(null);
  const [redeemEmail, setRedeemEmail] = useState("");
  const [redeemCountry, setRedeemCountry] = useState("");

  const [craftRecipes, setCraftRecipes] = useState<CraftRecipe[]>(CRAFT_RECIPES);
  const [craftBusyId, setCraftBusyId] = useState<string | null>(null);
  const [rewardOddsByChest, setRewardOddsByChest] = useState<RewardOddsByChest>(() => DEFAULT_REWARD_ODDS_BY_CHEST);

  const [isOpening, setIsOpening] = useState(false);
  const [openSequence, setOpenSequence] = useState(0);
  const [openingChestId, setOpeningChestId] = useState<ChestId | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<OpenChestApiResponse | null>(null);
  const [lastReveal, setLastReveal] = useState<{ title: string; rarity: string; type: string; xpGain: number } | null>(null);

  const inventory = useMemo(() => sortInventory(profile?.inventory ?? []), [profile?.inventory]);
  const inventoryById = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of profile?.inventory ?? []) {
      map.set(item.id, (map.get(item.id) ?? 0) + Math.max(0, Math.floor(item.quantity || 0)));
    }

    return map;
  }, [profile?.inventory]);

  const canCraft = useCallback(
    (recipe: CraftRecipe): boolean => {
      return recipe.materials.every((material) => (inventoryById.get(material.itemId) ?? 0) >= material.quantity);
    },
    [inventoryById],
  );

  const slotLimit = 20;
  const usedSlots = inventory.length;
  const fillPercent = Math.min(100, (usedSlots / slotLimit) * 100);

  const rpgXp = profile?.rpgXp ?? 0;
  const rpgLevel = Math.max(1, profile?.rpgLevel ?? 1);
  const xpSegment = getXpIntoCurrentLevel(rpgXp);

  const selectedMarketItem = chestMenu?.item ?? null;
  const giftCardRecipes = useMemo(
    () => craftRecipes.filter((recipe) => recipe.id.startsWith("craft-gift-card-")).sort((a, b) => a.title.localeCompare(b.title)),
    [craftRecipes],
  );
  const chestRecipes = useMemo(
    () => craftRecipes.filter((recipe) => !recipe.id.startsWith("craft-gift-card-")).sort((a, b) => a.title.localeCompare(b.title)),
    [craftRecipes],
  );

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

  useEffect(() => {
    let cancelled = false;

    const loadChestConfig = async () => {
      try {
        const response = await fetch("/api/rewards/chests/config", { cache: "no-store" });
        const payload = (await response.json()) as ChestConfigResponse;

        if (!cancelled && response.ok && payload?.config?.byChest) {
          setRewardOddsByChest({
            common: payload.config.byChest.common?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.common,
            uncommon: payload.config.byChest.uncommon?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.uncommon,
            rare: payload.config.byChest.rare?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.rare,
            epic: payload.config.byChest.epic?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.epic,
            legendary: payload.config.byChest.legendary?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.legendary,
            mythic: payload.config.byChest.mythic?.rewardOdds ?? DEFAULT_REWARD_ODDS_BY_CHEST.mythic,
          });
        }
      } catch {
        if (!cancelled) {
          setRewardOddsByChest(DEFAULT_REWARD_ODDS_BY_CHEST);
        }
      }
    };

    void loadChestConfig();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const redeemGiftcard = async () => {
    if (!user || !redeemItem || redeemBusy) {
      return;
    }

    const trimmedEmail = redeemEmail.trim();
    const trimmedCountry = redeemCountry.trim();

    if (!trimmedEmail || !trimmedCountry) {
      pushToast("error", "Preencha email e pais para resgatar.");
      return;
    }

    setRedeemBusy(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile/giftcards/redeem", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: redeemItem.id,
          email: trimmedEmail,
          country: trimmedCountry,
        }),
      });

      const payload = (await response.json()) as RedeemGiftcardResponse;
      if (!response.ok || !payload.ok) {
        pushToast("error", payload.error ?? "Nao foi possivel resgatar giftcard.");
        return;
      }

      pushToast("success", `Reivindicacao criada para ${payload.giftCardTitle ?? redeemItem.name}.`);
      setShowRedeemModal(false);
      setRedeemItem(null);
      reload();
    } catch {
      pushToast("error", "Servico de resgate indisponivel.");
    } finally {
      setRedeemBusy(false);
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
    <div
      className="loot-shell relative overflow-hidden pb-6"
      style={{
        backgroundImage: "url('/inventario/bgtotal.png')",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#4bcfff]/12 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#b16bff]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-[#ff9a4a]/8 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden px-1 py-3 sm:px-3 sm:py-5">
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-[#9adfff]">Inventory Core</p>
              <h1 className="font-throne text-4xl font-black leading-[0.95] text-white sm:text-6xl">MMO VAULT HUB</h1>
              <p className="text-sm leading-7 text-[#bfd4ec] sm:text-base">
                Chests, crafting and marketplace are now integrated directly into your inventory for a single premium gameplay loop.
              </p>
            </div>

            <div className="grid min-w-[220px] gap-1 border-l border-[#d4af5a]/45 pl-4">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#99b6d7]">Wallet</p>
              <p className="text-3xl font-black text-[#ffcf67]">{profile.lootCoins.toLocaleString("en-US")}</p>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#99b6d7]">Title</p>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#d8e9ff]">Level {rpgLevel}</p>
            </div>
          </div>

          <div className="relative mt-8 grid gap-x-6 gap-y-4 border-y border-white/10 py-4 sm:grid-cols-2 xl:grid-cols-5">
            <article className="px-1">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Inventory Slots</p>
              <p className="mt-2 text-2xl font-black text-white">{usedSlots}/{slotLimit}</p>
            </article>
            <article className="px-1">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">RPG XP</p>
              <p className="mt-2 text-2xl font-black text-white">{rpgXp}</p>
            </article>
            <article className="px-1">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">XP Progress</p>
              <p className="mt-2 text-2xl font-black text-white">{xpSegment.inLevel}/{xpSegment.levelCap}</p>
            </article>
            <article className="px-1">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Sales</p>
              <p className="mt-2 text-2xl font-black text-white">{profile.marketplaceSales ?? 0}</p>
            </article>
            <article className="px-1">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Buys</p>
              <p className="mt-2 text-2xl font-black text-white">{profile.marketplaceBuys ?? 0}</p>
            </article>
          </div>

          <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-black/35">
            <motion.div className="h-full bg-gradient-to-r from-[#59cfff] via-[#4f8cff] to-[#c06dff]" animate={{ width: `${fillPercent}%` }} transition={{ duration: 0.45 }} />
          </div>

          <div className="relative mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenCraftCategory(null);
                setShowCraftMenu(true);
              }}
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

        <section className="relative px-1 py-3 sm:px-3 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-throne text-3xl font-black text-white">Inventory Grid</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#a6c0df]">Click chest or gift card items for contextual actions</p>
            </div>
            <span className={`px-1 py-1 text-[0.62rem] font-black uppercase tracking-[0.15em] ${usedSlots >= slotLimit ? "text-rose-100" : "text-emerald-100"}`}>
              {usedSlots >= slotLimit ? "Inventory Full" : "Space Available"}
            </span>
          </div>

          <div className="relative mt-5 mx-auto w-full max-w-[1526px] overflow-hidden rounded-[1.25rem] border border-[#d4af5a]/45 bg-[#0c1220]/35 p-3 shadow-[0_20px_55px_rgba(0,0,0,0.28)] aspect-[5/4] min-h-[620px]">
            <div
              className="absolute inset-[18px]"
              style={{
                backgroundImage: "url('/inventario/inventariobg.png')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity: 0.95,
              }}
            />
            <div className="absolute inset-[18px] bg-[radial-gradient(circle_at_center,rgba(255,248,228,0.18),rgba(94,68,28,0.08)_45%,rgba(12,18,32,0.18))]" />
            <div className="absolute inset-[7%] z-10 grid grid-cols-5 grid-rows-4 gap-[clamp(8px,1.5vw,22px)]">
              {Array.from({ length: slotLimit }).map((_, slotIndex) => {
                const item = inventory[slotIndex] ?? null;

                if (!item) {
                  return <div key={`slot-empty-${slotIndex}`} className="aspect-square rounded-xl border border-dashed border-[#d4af5a]/35 bg-black/20 shadow-[inset_0_0_18px_rgba(0,0,0,0.22)] backdrop-blur-[1px]" />;
                }

                const rarityClass = RARITY_GLOW[item.rarity] ?? "border-white/25";
                const itemIsChest = isChestItem(item);
                const itemIsRedeemableGiftCard = isRedeemableGiftCard(item);
                const chestIdForIcon = itemIsChest ? getChestIdByInventoryItem(item) ?? "common" : null;
                const itemIconSrc = itemIsChest ? getChestImagePath(chestIdForIcon) : item.iconPath || "/itens/general/ticket.png";

                return (
                  <motion.button
                    key={`${item.id}-${slotIndex}`}
                    type="button"
                    className={`group relative min-h-0 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(9,16,29,0.96),rgba(5,10,20,0.94))] p-2 text-left transition-all ${rarityClass} ${itemIsChest || itemIsRedeemableGiftCard ? "cursor-pointer" : "cursor-default"}`}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem((current) => (current?.id === item.id ? null : current))}
                    onClick={() => {
                      if (itemIsChest) {
                        const chestId = getChestIdByInventoryItem(item);
                        if (!chestId) {
                          pushToast("error", "This chest is not mapped in chest definitions.");
                          return;
                        }

                        setChestMenu({ item, chestId });
                        return;
                      }

                      if (itemIsRedeemableGiftCard) {
                        setRedeemItem(item);
                        setRedeemEmail(user.email ?? "");
                        setRedeemCountry("");
                        setShowRedeemModal(true);
                      }
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(255,255,255,0.16),transparent_60%)]" />
                    <span className={`absolute left-2 top-2 z-10 rounded border px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.1em] ${RARITY_BADGE[item.rarity] ?? "border-white/25 bg-black/45 text-white"}`}>
                      {RARITY_LABEL[item.rarity] ?? item.rarity}
                    </span>
                    <Image src={itemIconSrc} alt={item.name} width={88} height={88} className="relative mx-auto h-[70%] w-[70%] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      <span className="truncate rounded bg-black/55 px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-[#d7e7ff]">{item.name}</span>
                      <span className="rounded bg-black/65 px-1.5 py-0.5 text-[0.56rem] font-black text-white">{item.quantity}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
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
                <p>Gross: {(listingPrice * listingQuantity).toLocaleString("en-US")}</p>
                <p>Marketplace Fee (5%): {calculateMarketplaceFee(listingPrice * listingQuantity).toLocaleString("en-US")}</p>
                <p>You Receive: {calculateMarketplaceReceive(listingPrice * listingQuantity).toLocaleString("en-US")}</p>
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
                {(rewardOddsByChest[chestMenu.chestId] ?? CHEST_DEFINITIONS[chestMenu.chestId].rewardOdds).map((entry) => (
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
        {toast ? (
          <motion.div className="fixed right-4 top-4 z-[220] w-[min(92vw,420px)]" initial={{ opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${toast.kind === "success" ? "border-emerald-300/35 bg-emerald-500/16 text-emerald-100" : toast.kind === "error" ? "border-rose-300/35 bg-rose-500/16 text-rose-100" : "border-sky-300/35 bg-sky-500/16 text-sky-100"}`}>
              {toast.text}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showRedeemModal && redeemItem ? (
          <motion.div className="fixed inset-0 z-[176]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
              onClick={() => setShowRedeemModal(false)}
              aria-label="Close redeem modal"
            />

            <motion.section
              className="absolute left-1/2 top-1/2 w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/18 bg-[linear-gradient(180deg,rgba(11,22,38,0.98),rgba(7,13,22,0.98))] p-6"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#9ad6ff]">Redeem Giftcard</p>
              <h3 className="mt-2 text-2xl font-black text-white">{redeemItem.name}</h3>
              <p className="mt-2 text-sm text-[#c2d7ee]">Informe email e pais para abrir sua reivindicacao de giftcard.</p>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-semibold text-[#cde1f8]">
                  Email de resgate
                  <input
                    type="email"
                    value={redeemEmail}
                    onChange={(event) => setRedeemEmail(event.target.value)}
                    className="rounded-xl border border-white/16 bg-black/35 px-3 py-2 outline-none"
                    placeholder="seu-email@provedor.com"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[#cde1f8]">
                  Pais
                  <input
                    type="text"
                    value={redeemCountry}
                    onChange={(event) => setRedeemCountry(event.target.value)}
                    className="rounded-xl border border-white/16 bg-black/35 px-3 py-2 outline-none"
                    placeholder="Brasil"
                  />
                </label>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => void redeemGiftcard()}
                  disabled={redeemBusy}
                  className="loot-gold-button flex-1 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
                >
                  {redeemBusy ? "Resgatando..." : "Confirmar resgate"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="loot-secondary-button rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em]"
                >
                  Cancelar
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCraftMenu ? (
          <motion.div className="fixed inset-0 z-[175]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" onClick={() => setShowCraftMenu(false)} aria-label="Close crafting menu" />

            <motion.section
              className="absolute left-1/2 top-1/2 max-h-[88vh] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/16 bg-[linear-gradient(180deg,rgba(12,22,36,0.98),rgba(7,13,24,0.98))] p-5 sm:p-6"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#9ad6ff]">Craft Menu</p>
                  <h3 className="mt-1 text-3xl font-black text-white">Crafting Workbench</h3>
                </div>
                <button type="button" onClick={() => setShowCraftMenu(false)} className="loot-secondary-button rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em]">
                  Close
                </button>
              </div>

              <div className="grid gap-3">
                <article className="rounded-2xl border border-white/12 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setOpenCraftCategory((current) => (current === "gift-cards" ? null : "gift-cards"))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-white">{openCraftCategory === "gift-cards" ? "▼" : "▶"} Gift Cards</span>
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#9fbad8]">{giftCardRecipes.length} recipes</span>
                  </button>

                  {openCraftCategory === "gift-cards" ? (
                    <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {giftCardRecipes.map((recipe) => {
                        const recipeCraftable = canCraft(recipe);
                        const recipeIconSrc = recipe.outputItem.iconPath ?? "/giftcards/default.svg";

                        return (
                          <article key={recipe.id} className="rounded-2xl border border-cyan-200/22 bg-[linear-gradient(160deg,rgba(4,14,28,0.9),rgba(10,23,41,0.78))] p-4">
                            <div className="flex items-start gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-black/35 p-2">
                                <Image src={recipeIconSrc} alt={recipe.title} fill className="object-contain" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#9ed6ff]">Gift Card</p>
                                <h4 className={`mt-1 text-lg font-black ${RARITY_TEXT[recipe.outputItem.rarity] ?? "text-white"}`}>{recipe.title}</h4>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2">
                              {recipe.materials.map((material) => {
                                const owned = inventoryById.get(material.itemId) ?? 0;
                                const percent = Math.max(0, Math.min(100, Math.round((Math.min(owned, material.quantity) / material.quantity) * 100)));

                                return (
                                  <div key={`${recipe.id}-${material.itemId}`}>
                                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#d5e7fb]">{material.name} {owned}/{material.quantity}</p>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/12 bg-black/35">
                                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#58b6ff,#6ee7f7,#35d27d)]" style={{ width: `${percent}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => void craftRecipe(recipe.id)}
                              disabled={craftBusyId !== null || !recipeCraftable}
                              className="loot-gold-button mt-4 w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
                            >
                              {craftBusyId === recipe.id ? "Crafting..." : recipeCraftable ? "Craft" : "Missing Materials"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </article>

                <article className="rounded-2xl border border-white/12 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setOpenCraftCategory((current) => (current === "chests" ? null : "chests"))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-white">{openCraftCategory === "chests" ? "▼" : "▶"} Chests</span>
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#9fbad8]">{chestRecipes.length} entries</span>
                  </button>

                  {openCraftCategory === "chests" ? (
                    <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {chestRecipes.map((recipe) => {
                        const recipeCraftable = canCraft(recipe);
                        const recipeIconSrc = recipe.outputItem.iconPath ?? getChestImagePath("common");

                        return (
                          <article key={recipe.id} className="rounded-2xl border border-cyan-200/22 bg-[linear-gradient(160deg,rgba(4,14,28,0.9),rgba(10,23,41,0.78))] p-4">
                            <div className="flex items-start gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-black/35 p-2">
                                <Image src={recipeIconSrc} alt={recipe.title} fill className="object-contain" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#9ed6ff]">Chest</p>
                                <h4 className={`mt-1 text-lg font-black ${RARITY_TEXT[recipe.outputItem.rarity] ?? "text-white"}`}>{recipe.title}</h4>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2">
                              {recipe.materials.map((material) => {
                                const owned = inventoryById.get(material.itemId) ?? 0;
                                const percent = Math.max(0, Math.min(100, Math.round((Math.min(owned, material.quantity) / material.quantity) * 100)));

                                return (
                                  <div key={`${recipe.id}-${material.itemId}`}>
                                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#d5e7fb]">{material.name} {owned}/{material.quantity}</p>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/12 bg-black/35">
                                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#58b6ff,#6ee7f7,#35d27d)]" style={{ width: `${percent}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => void craftRecipe(recipe.id)}
                              disabled={craftBusyId !== null || !recipeCraftable}
                              className="loot-gold-button mt-4 w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
                            >
                              {craftBusyId === recipe.id ? "Crafting..." : recipeCraftable ? "Craft" : "Missing Materials"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              </div>
            </motion.section>
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
