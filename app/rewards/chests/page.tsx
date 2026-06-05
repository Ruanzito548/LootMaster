"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ChestOpeningAnimation } from "../../components/chests/ChestOpeningAnimation";
import { CHEST_IDS, CHEST_DEFINITIONS, getChestCountFromInventory, type ChestId } from "../../../lib/chests";
import { useProfileSession } from "../../profile/use-profile-session";

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
};

type RevealReward = {
  title: string;
  rarity: string;
  type: "coins" | "item" | "chest" | "cosmetic";
  amount?: number;
  openedAt: number;
};

type ToastState = {
  id: number;
  kind: "success" | "error";
  text: string;
};

const CHART_LABEL_BY_TYPE: Record<string, string> = {
  coins: "Coins",
  item: "Item",
  chest: "Bonus Chest",
  cosmetic: "Cosmetic",
};

const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"] as const;

const RARITY_THEME: Record<string, { glow: string; accent: string; edge: string; soft: string; badge: string; title: string }> = {
  common: {
    glow: "shadow-[0_0_36px_rgba(201,210,226,0.16)]",
    accent: "from-[#dae2ef] via-[#c6cfdf] to-[#9ca8bb]",
    edge: "border-[#d7deeb]/40",
    soft: "bg-[radial-gradient(circle_at_20%_20%,rgba(211,220,235,0.24),rgba(8,12,18,0.7)_58%)]",
    badge: "text-[#dbe3f1]",
    title: "text-[#f1f6ff]",
  },
  rare: {
    glow: "shadow-[0_0_38px_rgba(92,170,255,0.22)]",
    accent: "from-[#7ed8ff] via-[#4ea4ff] to-[#3474ff]",
    edge: "border-[#5ab4ff]/46",
    soft: "bg-[radial-gradient(circle_at_18%_20%,rgba(78,164,255,0.34),rgba(8,16,34,0.76)_62%)]",
    badge: "text-[#8fd0ff]",
    title: "text-[#d7f0ff]",
  },
  epic: {
    glow: "shadow-[0_0_44px_rgba(184,107,255,0.28)]",
    accent: "from-[#dba2ff] via-[#b46cff] to-[#7d4dff]",
    edge: "border-[#bb74ff]/48",
    soft: "bg-[radial-gradient(circle_at_16%_22%,rgba(173,95,255,0.36),rgba(19,10,36,0.82)_62%)]",
    badge: "text-[#deb7ff]",
    title: "text-[#f2dcff]",
  },
  legendary: {
    glow: "shadow-[0_0_48px_rgba(255,183,74,0.3)]",
    accent: "from-[#ffe8b5] via-[#ffbf5c] to-[#ff8f35]",
    edge: "border-[#ffbe66]/52",
    soft: "bg-[radial-gradient(circle_at_20%_18%,rgba(255,182,90,0.38),rgba(39,20,8,0.84)_64%)]",
    badge: "text-[#ffd99e]",
    title: "text-[#fff0cf]",
  },
  mythic: {
    glow: "shadow-[0_0_54px_rgba(255,73,92,0.34)]",
    accent: "from-[#ffb9c2] via-[#ff6d83] to-[#d92249]",
    edge: "border-[#ff5d73]/55",
    soft: "bg-[radial-gradient(circle_at_22%_18%,rgba(255,88,108,0.4),rgba(38,7,14,0.86)_66%)]",
    badge: "text-[#ffbec7]",
    title: "text-[#ffe2e6]",
  },
};

const PREVIEW_REWARDS_BY_CHEST: Record<ChestId, string[]> = {
  common: ["Loot Coins", "Common Loot", "Bonus Chest", "Entry Cosmetic"],
  rare: ["Rare Loot", "Coins Boost", "Bonus Rare Chest", "Refined Cosmetic"],
  epic: ["Epic Loot", "High Coin Burst", "Epic Bonus Chest", "Premium Cosmetic"],
  legendary: ["Legend Loot", "Major Coin Burst", "Legendary Bonus Chest", "Elite Cosmetic"],
  mythic: ["Mythic Loot", "Ultra Coin Burst", "Mythic Chain Chest", "Mythic Cosmetic"],
};

const REWARD_VALUE_ESTIMATE: Record<string, number> = {
  coins: 1,
  item: 1.8,
  chest: 2.2,
  cosmetic: 3.2,
};

function asChestRarity(value: string): string {
  if (value === "mythic" || value === "legendary" || value === "epic" || value === "rare") {
    return value;
  }

  return "common";
}

function getHighestOwnedRarity(entries: Array<{ id: ChestId; quantity: number }>): string {
  for (let index = RARITY_ORDER.length - 1; index >= 0; index -= 1) {
    const rarity = RARITY_ORDER[index]!;
    const item = entries.find((entry) => entry.id === rarity);
    if (item && item.quantity > 0) {
      return rarity;
    }
  }

  return "common";
}

function estimateChestValue(chest: {
  coinRange: { min: number; max: number };
  rewardOdds: Array<{ type: string; weight: number }>;
}): number {
  const coinAverage = (chest.coinRange.min + chest.coinRange.max) / 2;
  return chest.rewardOdds.reduce((total, entry) => {
    const multiplier = REWARD_VALUE_ESTIMATE[entry.type] ?? 1;
    return total + (entry.weight / 100) * coinAverage * multiplier;
  }, 0);
}

export default function RewardsChestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, user } = useProfileSession();

  const [lastRewardByChest, setLastRewardByChest] = useState<Record<string, RevealReward | undefined>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [totalOpenings, setTotalOpenings] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const [isOpening, setIsOpening] = useState(false);
  const [openingChestId, setOpeningChestId] = useState<ChestId | null>(null);
  const [openSequence, setOpenSequence] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<OpenChestApiResponse | null>(null);

  const chestEntries = useMemo(
    () =>
      CHEST_IDS.map((id) => {
        const definition = CHEST_DEFINITIONS[id];
        const quantity = profile ? getChestCountFromInventory(profile.inventory, id) : 0;

        return {
          ...definition,
          quantity,
        };
      }),
    [profile],
  );

  const totalChestsOwned = useMemo(() => chestEntries.reduce((sum, item) => sum + item.quantity, 0), [chestEntries]);
  const highestRarityOwned = useMemo(() => getHighestOwnedRarity(chestEntries), [chestEntries]);
  const ownedChestTypes = useMemo(() => chestEntries.filter((item) => item.quantity > 0).length, [chestEntries]);

  const pushToast = useCallback((kind: ToastState["kind"], text: string) => {
    setToast({
      id: Date.now(),
      kind,
      text,
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 4600);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      if (!user) {
        if (!cancelled) {
          setLoadingStats(false);
          setTotalOpenings(0);
        }
        return;
      }

      setLoadingStats(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/profile/rewards/chest-stats", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as { totalOpenings?: number };

        if (!cancelled && response.ok) {
          setTotalOpenings(typeof payload.totalOpenings === "number" ? payload.totalOpenings : 0);
        }
      } catch {
        if (!cancelled) {
          setTotalOpenings(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingStats(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const finalizeOpen = useCallback(() => {
    if (!openingChestId) {
      setIsOpening(false);
      setAnimationDone(false);
      setRequestDone(false);
      return;
    }

    if (requestError) {
      pushToast("error", requestError);
    } else if (pendingResult?.ok) {
      const resultTitle = pendingResult.reward.title;
      setLastRewardByChest((current) => ({
        ...current,
        [openingChestId]: {
          title: resultTitle,
          rarity: pendingResult.reward.rarity,
          type: pendingResult.reward.type,
          amount: pendingResult.reward.amount,
          openedAt: Date.now(),
        },
      }));
      setTotalOpenings((current) => current + (pendingResult.replayed ? 0 : 1));
      pushToast("success", `Reward delivered: ${resultTitle}`);
      router.refresh();
    }

    setIsOpening(false);
    setOpeningChestId(null);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);
  }, [openingChestId, pendingResult, pushToast, requestError, router]);

  useEffect(() => {
    if (isOpening && animationDone && requestDone) {
      finalizeOpen();
    }
  }, [animationDone, finalizeOpen, isOpening, requestDone]);

  const openChest = async (chestId: ChestId) => {
    if (isOpening || !profile || !user) {
      return;
    }

    const available = getChestCountFromInventory(profile.inventory, chestId);
    if (available <= 0) {
      pushToast("error", "You do not have this chest available in your inventory.");
      return;
    }

    setOpeningChestId(chestId);
    setOpenSequence((current) => current + 1);
    setIsOpening(true);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);

    try {
      const requestId = crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "");
      const token = await user.getIdToken();

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
        const apiError = "error" in payload && typeof payload.error === "string" ? payload.error : "Could not open chest.";
        setRequestError(apiError);
      } else {
        setPendingResult(payload);
      }
    } catch {
      setRequestError("Network error while opening chest.");
    } finally {
      setRequestDone(true);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setAnimationDone(true);
  }, []);

  useEffect(() => {
    setIsOpening(false);
    setOpeningChestId(null);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);
    setToast(null);
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="loot-shell relative overflow-hidden">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-7">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-4 h-14 w-full max-w-2xl animate-pulse rounded-xl bg-white/10" />
            <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-lg bg-white/10" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-stat-${index}`} className="h-28 animate-pulse rounded-2xl bg-white/10" />
              ))}
            </div>
          </section>

          <section className="mt-7 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <article key={`skeleton-card-${index}`} className="h-[420px] animate-pulse rounded-[1.8rem] border border-white/10 bg-white/5" />
            ))}
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
            <p className="loot-muted mt-3 text-sm">Sign in to open your chests and claim rewards.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Sign in
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const heroTheme = RARITY_THEME[highestRarityOwned] ?? RARITY_THEME.common;

  return (
    <div className="loot-shell relative overflow-hidden pb-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#6dc4ff]/15 blur-3xl" />
        <div className="absolute -right-16 top-28 h-80 w-80 rounded-full bg-[#9b6cff]/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-[#ff7f5d]/10 blur-3xl" />

        {Array.from({ length: 16 }).map((_, index) => (
          <motion.span
            key={`particle-${index}`}
            className="absolute rounded-full bg-white/35"
            style={{
              width: index % 3 === 0 ? 2 : 3,
              height: index % 3 === 0 ? 2 : 3,
              left: `${6 + index * 6}%`,
              top: `${8 + (index % 6) * 14}%`,
            }}
            animate={{ opacity: [0.15, 0.65, 0.2], y: [0, -9, 0] }}
            transition={{ duration: 3 + (index % 5), repeat: Infinity, ease: "easeInOut", delay: index * 0.08 }}
          />
        ))}
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <motion.section
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 ${heroTheme.edge} ${heroTheme.glow} ${heroTheme.soft}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_38%,transparent_68%,rgba(255,255,255,0.05))]" />

          <div className="relative">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#98d8ff]">Rewards Vault</p>
            <h1 className="mt-3 font-throne text-4xl font-black leading-[0.9] text-white sm:text-6xl">OPEN PREMIUM CHESTS</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c3d3ea] sm:text-base">
              Cinematic chest opening system with real inventory sync, backend-validated drops and rarity-based visual identity.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#dcecff]">AAA Lootbox Flow</span>
              <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#dcecff]">Realtime Reward Delivery</span>
              <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#dcecff]">Anti Exploit Protected</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Total Chests</p>
                <p className="mt-2 text-2xl font-black text-white">{totalChestsOwned}</p>
              </div>

              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Highest Rarity</p>
                <p className="mt-2 text-2xl font-black capitalize text-white">{highestRarityOwned}</p>
              </div>

              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Openings</p>
                <p className="mt-2 text-2xl font-black text-white">{loadingStats ? "..." : totalOpenings}</p>
              </div>

              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Loot Balance</p>
                <p className="mt-2 text-2xl font-black text-white">{profile.lootCoins.toLocaleString("pt-BR")}</p>
              </div>

              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Owned Types</p>
                <p className="mt-2 text-2xl font-black text-white">{ownedChestTypes}/5</p>
              </div>

              <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Current Level</p>
                <p className="mt-2 text-2xl font-black text-white">{profile.level}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {chestEntries.map((chest, index) => {
            const theme = RARITY_THEME[chest.rarity] ?? RARITY_THEME.common;
            const estimatedValue = estimateChestValue(chest);
            const jackpotChance = chest.rewardOdds.find((entry) => entry.type === "cosmetic")?.weight ?? 0;
            const reveal = lastRewardByChest[chest.id];
            const canOpen = chest.quantity > 0 && !isOpening;

            return (
              <motion.article
                key={chest.id}
                className={`group relative overflow-hidden rounded-[1.7rem] border bg-[linear-gradient(155deg,rgba(255,255,255,0.04),rgba(8,14,24,0.88))] p-5 ${theme.edge} ${theme.glow}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: index * 0.05 }}
                whileHover={{ y: -6, scale: 1.01, rotateX: 1.6 }}
                style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:linear-gradient(130deg,rgba(255,255,255,0.08),transparent_35%,transparent_74%,rgba(255,255,255,0.07))]" />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[0.62rem] font-black uppercase tracking-[0.2em] ${theme.badge}`}>{chest.shortLabel} Tier</p>
                    <h2 className={`mt-2 text-2xl font-black ${theme.title}`}>{chest.title}</h2>
                    <p className="mt-2 text-sm text-[#b6c6de]">{chest.description}</p>
                  </div>

                  <div className="rounded-full border border-white/16 bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e0ebfb]">
                    x{chest.quantity}
                  </div>
                </div>

                <div className={`relative mt-5 overflow-hidden rounded-2xl border border-white/12 ${theme.soft}`}>
                  <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.18),transparent_55%)]" />
                  <div className="absolute -right-8 top-3 text-8xl opacity-15">🧰</div>
                  <motion.div
                    className="relative mx-auto flex h-40 w-full max-w-[230px] items-center justify-center"
                    animate={{ y: [0, -5, 0], rotateZ: [0, 1.4, 0] }}
                    transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className={`absolute inset-6 rounded-full bg-gradient-to-r ${theme.accent} opacity-26 blur-2xl`} />
                    <Image src="/itens/general/ticket.png" alt={`${chest.title} artwork`} width={176} height={176} className="relative h-32 w-32 object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.45)]" />
                  </motion.div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PREVIEW_REWARDS_BY_CHEST[chest.id].map((label) => (
                    <span key={`${chest.id}-preview-${label}`} className="rounded-full border border-white/14 bg-white/6 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#d4e2f5]">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-2">
                  {chest.rewardOdds.map((entry) => {
                    const width = Math.max(6, Math.min(100, entry.weight));
                    return (
                      <div key={`${chest.id}-rate-${entry.type}`} className="space-y-1">
                        <div className="flex items-center justify-between text-[0.66rem] font-bold uppercase tracking-[0.13em] text-[#c3d3e8]">
                          <span>{CHART_LABEL_BY_TYPE[entry.type]}</span>
                          <span>{entry.weight}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${theme.accent}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.45, delay: 0.08 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#9fb7d8]">
                  <div className="rounded-xl border border-white/12 bg-black/28 px-3 py-2">
                    <p>Jackpot Chance</p>
                    <p className="mt-1 text-sm font-black text-[#d8e8ff]">{jackpotChance}%</p>
                  </div>
                  <div className="rounded-xl border border-white/12 bg-black/28 px-3 py-2">
                    <p>Avg Loot Value</p>
                    <p className="mt-1 text-sm font-black text-[#d8e8ff]">~{Math.round(estimatedValue)} LC</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void openChest(chest.id)}
                    disabled={!canOpen}
                    className={`inline-flex rounded-full border px-5 py-2.5 text-sm font-black uppercase tracking-[0.14em] transition-all ${
                      canOpen
                        ? `bg-gradient-to-r ${theme.accent} text-[#081120] hover:brightness-110`
                        : "cursor-not-allowed border-white/14 bg-white/10 text-[#88a0c1]"
                    }`}
                  >
                    {isOpening && openingChestId === chest.id ? "Opening..." : "Open Chest"}
                  </button>

                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#9bb3d3]">
                    Inventory: {chest.quantity}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {reveal ? (
                    <motion.div
                      key={`${chest.id}-${reveal.openedAt}`}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.32 }}
                      className="relative mt-4 overflow-hidden rounded-2xl border border-white/14 bg-black/35 p-4"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.09),transparent_38%,transparent_78%,rgba(255,255,255,0.08))]" />
                      <div className="relative">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#9ec7ff]">Reward Reveal</p>
                        <p className="mt-2 text-lg font-black text-[#ecf4ff]">{reveal.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#c4d8f3]">
                          {reveal.type} • {asChestRarity(reveal.rarity)} rarity
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key={`${chest.id}-empty`} className="mt-4 rounded-2xl border border-dashed border-white/14 bg-black/25 p-4 text-sm text-[#96accd]">
                      Open this chest to trigger a cinematic reveal.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/rewards" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to rewards
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View inventory
          </Link>
        </div>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 top-4 z-[220] w-[min(92vw,420px)]"
          >
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${
                toast.kind === "success"
                  ? "border-emerald-300/35 bg-emerald-500/16 text-emerald-100"
                  : "border-rose-300/35 bg-rose-500/14 text-rose-100"
              }`}
            >
              {toast.text}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ChestOpeningAnimation
        isOpen={isOpening}
        openSequence={openSequence}
        onComplete={handleAnimationComplete}
        chestRarity={openingChestId ? CHEST_DEFINITIONS[openingChestId].rarity : undefined}
        chestTitle={openingChestId ? CHEST_DEFINITIONS[openingChestId].title : undefined}
      />
    </div>
  );
}
