"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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

const CHART_LABEL_BY_TYPE: Record<string, string> = {
  coins: "Coins",
  item: "Item",
  chest: "Bonus Chest",
  cosmetic: "Cosmetic",
};

export default function RewardsChestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, user } = useProfileSession();

  const [lastRewardByChest, setLastRewardByChest] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const finalizeOpen = useCallback(() => {
    if (!openingChestId) {
      setIsOpening(false);
      setAnimationDone(false);
      setRequestDone(false);
      return;
    }

    if (requestError) {
      setErrorMessage(requestError);
      setMessage(null);
    } else if (pendingResult?.ok) {
      const resultTitle = pendingResult.reward.title;
      setLastRewardByChest((current) => ({
        ...current,
        [openingChestId]: resultTitle,
      }));
      setErrorMessage(null);
      setMessage(`Reward delivered: ${resultTitle}`);
      router.refresh();
    }

    setIsOpening(false);
    setOpeningChestId(null);
    setAnimationDone(false);
    setRequestDone(false);
    setRequestError(null);
    setPendingResult(null);
  }, [openingChestId, pendingResult, requestError, router]);

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
      setErrorMessage("You do not have this chest available in your inventory.");
      return;
    }

    setErrorMessage(null);
    setMessage(null);
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
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading chest system...</p>
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

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Chests
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Open your chests
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Open inventory-backed chests with real drop tables and guaranteed backend validation.
          </p>
        </div>

        {message ? <p className="mt-5 rounded-xl border border-[#79e2ff]/20 bg-[#79e2ff]/10 px-4 py-3 text-sm font-semibold text-[#c8f0ff]">{message}</p> : null}
        {errorMessage ? <p className="mt-5 rounded-xl border border-[#ff8e8e]/26 bg-[#ff8e8e]/10 px-4 py-3 text-sm font-semibold text-[#ffd1d1]">{errorMessage}</p> : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {chestEntries.map((chest) => (
            <article
              key={chest.id}
              className={`loot-panel rounded-[1.75rem] border p-8 transition-all duration-300 hover:-translate-y-1 ${chest.borderClass} ${chest.glowClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="loot-title text-3xl font-black">{chest.title}</h2>
                  <p className="loot-muted mt-4 text-base leading-7">{chest.description}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${chest.badgeClass}`}>
                  {chest.shortLabel}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-[0.67rem] font-bold uppercase tracking-[0.14em] text-[#c9d6ec]">
                {chest.rewardOdds.map((entry) => (
                  <span key={`${chest.id}-${entry.type}`} className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                    {CHART_LABEL_BY_TYPE[entry.type]} {entry.weight}%
                  </span>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="button"
                  onClick={() => void openChest(chest.id)}
                  disabled={isOpening || chest.quantity <= 0}
                  className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isOpening && openingChestId === chest.id ? "Opening..." : "Open Chest"}
                </button>

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9cb7db]">
                  Available in inventory: <span className="text-[#d6e9ff]">{chest.quantity}</span>
                </p>

                {lastRewardByChest[chest.id] ? (
                  <div className="rounded-[1.5rem] border border-[#fff1be]/10 bg-[#06121d]/80 p-5 text-sm">
                    <p className="loot-title text-xl font-black">Reward obtained</p>
                    <p className="loot-muted mt-3">{lastRewardByChest[chest.id]}</p>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-[#fff1be]/10 bg-[#06121d]/80 p-5 text-sm text-[#cdb991]">
                    Open the chest to see the result.
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/rewards" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to rewards
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View inventory
          </Link>
        </div>
      </main>

      <ChestOpeningAnimation isOpen={isOpening} openSequence={openSequence} onComplete={handleAnimationComplete} />
    </div>
  );
}
