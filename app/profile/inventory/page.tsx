"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildLevelReward, calculateLevelProgress, formatMoneyUsd, LEVEL_XP_REQUIREMENT, XP_PER_USD } from "../../../lib/level-rewards";
import { useProfileSession } from "../use-profile-session";
import { subscribeToInventoryItems, type InventoryCatalogItem, type WowRarity } from "../../../lib/inventory-items";
import { type InventoryItem } from "../../../lib/profile-data";

const wowRarityColor: Record<string, string> = {
  poor: "text-[#9d9d9d]",
  common: "text-[#ffffff]",
  uncommon: "text-[#1eff00]",
  rare: "text-[#0070dd]",
  epic: "text-[#a335ee]",
  legendary: "text-[#ff8000]",
  artifact: "text-[#e6cc80]",
  heirloom: "text-[#00ccff]",
};

const wowRarityBorder: Record<string, string> = {
  poor: "border-[#9d9d9d]/70",
  common: "border-[#ffffff]/65",
  uncommon: "border-[#1eff00]/75",
  rare: "border-[#0070dd]/75",
  epic: "border-[#a335ee]/75",
  legendary: "border-[#ff8000]/80",
  artifact: "border-[#e6cc80]/80",
  heirloom: "border-[#00ccff]/80",
};

const wowRarityHoverBackground: Record<string, string> = {
  poor: "group-hover:bg-[#9d9d9d]/20",
  common: "group-hover:bg-[#d8dde8]/22",
  uncommon: "group-hover:bg-[#1eff00]/18",
  rare: "group-hover:bg-[#0070dd]/18",
  epic: "group-hover:bg-[#a335ee]/20",
  legendary: "group-hover:bg-[#ff8000]/22",
  artifact: "group-hover:bg-[#e6cc80]/22",
  heirloom: "group-hover:bg-[#00ccff]/20",
};

const wowRarityHoverGlow: Record<string, string> = {
  poor: "group-hover:shadow-[0_0_22px_rgba(157,157,157,0.45)]",
  common: "group-hover:shadow-[0_0_22px_rgba(232,237,246,0.45)]",
  uncommon: "group-hover:shadow-[0_0_24px_rgba(30,255,0,0.45)]",
  rare: "group-hover:shadow-[0_0_24px_rgba(0,112,221,0.5)]",
  epic: "group-hover:shadow-[0_0_26px_rgba(163,53,238,0.5)]",
  legendary: "group-hover:shadow-[0_0_28px_rgba(255,128,0,0.5)]",
  artifact: "group-hover:shadow-[0_0_28px_rgba(230,204,128,0.55)]",
  heirloom: "group-hover:shadow-[0_0_26px_rgba(0,204,255,0.5)]",
};

const rarityValue: Record<WowRarity, number> = {
  poor: 40,
  common: 120,
  uncommon: 260,
  rare: 680,
  epic: 1600,
  legendary: 3900,
  artifact: 8200,
  heirloom: 5500,
};

const lootboxOdds: Array<{ rarity: WowRarity; chance: number }> = [
  { rarity: "common", chance: 60 },
  { rarity: "rare", chance: 30 },
  { rarity: "epic", chance: 9 },
  { rarity: "legendary", chance: 1 },
];

export default function InventoryPage() {
  const { status, profile, saveProfile } = useProfileSession();
  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItem[]>([]);
  const [opening, setOpening] = useState(false);
  const [openingPhase, setOpeningPhase] = useState("");
  const [lastDropName, setLastDropName] = useState<string | null>(null);
  const [lastDropRarity, setLastDropRarity] = useState<WowRarity | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => subscribeToInventoryItems(setCatalogItems), []);

  const inventory = useMemo(() => profile?.inventory ?? [], [profile?.inventory]);
  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const nextReward = buildLevelReward(progress.nextLevel, `${profile?.uid ?? "inventory"}-preview`);

  const clampQuantity = (value: number) => Math.max(0, Math.floor(value));

  const playDropSound = (rarity: WowRarity) => {
    const frequency: Record<WowRarity, number> = {
      poor: 200,
      common: 260,
      uncommon: 320,
      rare: 410,
      epic: 520,
      legendary: 650,
      artifact: 780,
      heirloom: 720,
    };

    try {
      const AudioContextRef = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextRef) {
        return;
      }

      const ctx = new AudioContextRef();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = frequency[rarity];
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.37);
    } catch {
      // Ignore audio errors to keep gameplay actions non-blocking.
    }
  };

  const rollRarity = (): WowRarity => {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const entry of lootboxOdds) {
      cumulative += entry.chance;
      if (roll < cumulative) {
        return entry.rarity;
      }
    }

    return "common";
  };

  const randomDropByRarity = (rarity: WowRarity): InventoryItem => {
    const pool = catalogItems.filter((item) => item.rarity === rarity);
    const fallbackNames: Record<WowRarity, string> = {
      poor: "Worn Fragment",
      common: "Traveler Ticket",
      uncommon: "Scout Relic",
      rare: "Arcane Emblem",
      epic: "Champion Ticket",
      legendary: "Dragon Sigil",
      artifact: "Ancient Artifact",
      heirloom: "Heirloom Crest",
    };

    const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;

    return {
      id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: chosen?.name ?? fallbackNames[rarity],
      category: "Loot",
      description: `Dropped from key opening (${rarity}).`,
      quantity: 1,
      rarity,
      iconPath: chosen?.iconPath ?? "/itens/general/ticket.png",
    };
  };

  const sellItem = async (slotIndex: number) => {
    if (!profile) {
      return;
    }

    const item = inventory[slotIndex];
    if (!item) {
      return;
    }

    const payout = (rarityValue[item.rarity] ?? 100) * clampQuantity(item.quantity || 1);
    const nextInventory = inventory.filter((_, idx) => idx !== slotIndex);

    const ok = await saveProfile({
      inventory: nextInventory,
      lootCoins: profile.lootCoins + payout,
    });

    setFeedback(ok ? `Sold ${item.name} for ${payout.toLocaleString("pt-BR")} coins.` : "Could not sell item right now.");
  };

  const consumeItem = async (slotIndex: number) => {
    if (!profile) {
      return;
    }

    const item = inventory[slotIndex];
    if (!item) {
      return;
    }

    const isTicket = item.category.toLowerCase().includes("ticket") || item.name.toLowerCase().includes("ticket");
    if (!isTicket) {
      setFeedback(`${item.name} cannot be used yet.`);
      return;
    }

    const nextInventory = inventory
      .map((row, idx) => {
        if (idx !== slotIndex) {
          return row;
        }

        return {
          ...row,
          quantity: clampQuantity((row.quantity || 1) - 1),
        };
      })
      .filter((row) => row.quantity > 0);

    const ok = await saveProfile({
      inventory: nextInventory,
      tickets: profile.tickets + 1,
    });

    setFeedback(ok ? `${item.name} used. +1 ticket added.` : "Could not use item right now.");
  };

  const createTradeOffer = async (slotIndex: number) => {
    const item = inventory[slotIndex];
    if (!item || !profile) {
      return;
    }

    const offerCode = [
      "LM-TRADE",
      profile.uid.slice(0, 6).toUpperCase(),
      item.id.slice(0, 6).toUpperCase(),
      Date.now().toString(36).toUpperCase(),
    ].join("-");

    const payload = JSON.stringify(
      {
        offerCode,
        from: profile.email,
        item: {
          id: item.id,
          name: item.name,
          rarity: item.rarity,
          quantity: item.quantity,
          valueCoins: rarityValue[item.rarity] ?? 0,
        },
      },
      null,
      2,
    );

    try {
      await navigator.clipboard.writeText(payload);
      setFeedback(`Trade offer copied for ${item.name}.`);
    } catch {
      setFeedback("Could not copy trade offer to clipboard.");
    }
  };

  const openLootbox = async () => {
    if (!profile || opening) {
      return;
    }

    if (profile.keys <= 0) {
      setFeedback("You need at least 1 key.");
      return;
    }

    setOpening(true);
    setFeedback(null);
    setLastDropName(null);
    setLastDropRarity(null);

    const spinFrames = 10;
    for (let i = 0; i < spinFrames; i += 1) {
      const preview = lootboxOdds[Math.floor(Math.random() * lootboxOdds.length)]?.rarity ?? "common";
      setOpeningPhase(preview.toUpperCase());
      await new Promise((resolve) => setTimeout(resolve, 95));
    }

    const rarity = rollRarity();
    const droppedItem = randomDropByRarity(rarity);

    const ok = await saveProfile({
      keys: profile.keys - 1,
      inventory: [...inventory, droppedItem],
    });

    if (ok) {
      setLastDropName(droppedItem.name);
      setLastDropRarity(rarity);
      setFeedback(`Drop: ${droppedItem.name} (${rarity})`);
      playDropSound(rarity);
    } else {
      setFeedback("Could not open case right now.");
    }

    setOpening(false);
    setOpeningPhase("");
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading inventory...</p>
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
            <p className="loot-muted mt-3 text-sm">Log in to view your inventory.</p>
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Inventory</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Unlimited vault</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            All rewards land here automatically. No slot limits, no VIP lock, just a clean account vault.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="loot-panel rounded-[2rem] p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Loot Coins</p>
                <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">{profile.lootCoins.toLocaleString("pt-BR")}</h2>
                <p className="loot-muted mt-4 text-sm leading-7">Available balance for marketplace purchases.</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#09111f]/70 px-4 py-3 text-right">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#9fb8db]">Level</p>
                <p className="mt-2 text-3xl font-black text-[#8dd0ff]">{progress.level}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">XP</p>
                <p className="mt-2 text-2xl font-black text-[#8dd0ff]">{progress.xpCents.toFixed(2)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Next reward</p>
                <p className="mt-2 text-lg font-black text-[#ffcf57]">{nextReward.title}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Items</p>
                <p className="mt-2 text-2xl font-black text-[#dff7ff]">{inventory.length}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Back to profile
              </Link>
              <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Rewards
              </Link>
            </div>
          </article>

          <article className="loot-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="loot-title text-3xl font-black">Key opening</h2>
              <button
                type="button"
                onClick={() => void openLootbox()}
                disabled={opening}
                className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {opening ? "Opening..." : "Open with 1 key"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ffffff14] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Drop odds</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {lootboxOdds.map((entry) => (
                    <li key={entry.rarity} className="flex items-center justify-between">
                      <span className={wowRarityColor[entry.rarity]}>{entry.rarity.toUpperCase()}</span>
                      <span className="font-bold text-[#d7e6ff]">{entry.chance}%</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-xl border border-[#ffffff14] bg-[#09111f]/70 p-4 ${lastDropRarity ? wowRarityHoverGlow[lastDropRarity] : ""}`}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Drop result</p>
                <p className="mt-3 text-sm text-[#d7e6ff]">
                  {opening ? (
                    <span className="inline-block rounded bg-[#050c15]/80 px-3 py-1 text-xs font-black tracking-[0.16em] animate-pulse">
                      {openingPhase || "ROLLING"}
                    </span>
                  ) : lastDropName ? (
                    <>
                      <span className={lastDropRarity ? wowRarityColor[lastDropRarity] : "text-white"}>{lastDropName}</span>
                      <span className="ml-2 text-xs uppercase tracking-[0.16em] text-[#9fb8db]">{lastDropRarity}</span>
                    </>
                  ) : (
                    "Use a key to roll your next item."
                  )}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="loot-title text-3xl font-black">Inventory items</h2>
              <p className="loot-muted mt-2 text-sm">Everything stays organized in a single unlimited vault.</p>
            </div>
            <div className="rounded-full border border-[#ffffff14] bg-[#09111f]/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">
              {formatMoneyUsd(progress.totalSpentUsd)} spent
            </div>
          </div>

          {feedback ? <p className="mt-4 text-sm font-semibold text-[#8dd0ff]">{feedback}</p> : null}

          {inventory.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {inventory.map((item, index) => {
                const rarityBorder = wowRarityBorder[item.rarity] || "border-[#d6d6d6]/25";
                const rarityHoverBg = wowRarityHoverBackground[item.rarity] || "";
                const rarityHoverGlow = wowRarityHoverGlow[item.rarity] || "";

                return (
                  <article
                    key={item.id}
                    className={`group overflow-hidden rounded-[1.5rem] border bg-[#09111f]/90 transition-transform duration-300 hover:-translate-y-1 ${rarityBorder} ${rarityHoverBg} ${rarityHoverGlow}`}
                  >
                    <div className="grid gap-4 p-4 sm:grid-cols-[96px_1fr]">
                      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#06101a]">
                        <div className={`absolute inset-0 ${item.rarity === "legendary" ? "bg-[#ff8000]/10" : "bg-[#4dc6ff]/10"}`} />
                        <Image
                          src={item.iconPath || "/itens/general/ticket.png"}
                          alt={item.name}
                          width={84}
                          height={84}
                          className="relative h-20 w-20 object-contain"
                        />
                      </div>

                      <div className="flex min-w-0 flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="loot-title text-xl font-black leading-tight">{item.name}</h3>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#d7e6ff]">
                              {item.quantity}x
                            </span>
                          </div>
                          <p className={`mt-2 text-xs font-bold uppercase tracking-[0.18em] ${wowRarityColor[item.rarity] ?? "text-[#d7e6ff]"}`}>
                            {item.rarity}
                          </p>
                          <p className="loot-muted mt-3 text-sm leading-6">{item.description}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void sellItem(index)}
                            className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold"
                          >
                            Sell
                          </button>
                          <button
                            type="button"
                            onClick={() => void consumeItem(index)}
                            className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => void createTradeOffer(index)}
                            className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold"
                          >
                            Copy offer
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-[#09111f]/70 p-8 text-center">
              <p className="loot-title text-2xl font-black">Inventory is empty</p>
              <p className="loot-muted mt-3 text-sm">Open a chest or wait for a level reward to populate the vault.</p>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dd0ff]">Next level</p>
            <h2 className="loot-title mt-4 text-3xl font-black">{nextReward.title}</h2>
            <p className="loot-muted mt-4 text-base leading-7">{nextReward.description}</p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#f7ba2c]">Progress</p>
            <h2 className="loot-title mt-4 text-3xl font-black">{progress.progressPercent}% to level {progress.nextLevel}</h2>
            <p className="loot-muted mt-4 text-base leading-7">$1 = {XP_PER_USD} XP, and each level needs {LEVEL_XP_REQUIREMENT} XP.</p>
          </article>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/rewards" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View rewards
          </Link>
        </div>
      </main>
    </div>
  );
}