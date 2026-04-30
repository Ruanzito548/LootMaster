"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

type ContextMenuState = {
  x: number;
  y: number;
  slotIndex: number;
};

const totalSlots = 15;
const baseSlots = 9;

export default function InventoryPage() {
  const { status, profile, saveProfile } = useProfileSession();
  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItem[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openingPhase, setOpeningPhase] = useState("");
  const [lastDropName, setLastDropName] = useState<string | null>(null);
  const [lastDropRarity, setLastDropRarity] = useState<WowRarity | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => subscribeToInventoryItems(setCatalogItems), []);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const isVip = profile?.vipInventory === true;
  const unlockedSlots = isVip ? totalSlots : Math.max(baseSlots, profile?.inventorySlots ?? baseSlots);
  const inventory = useMemo(() => profile?.inventory ?? [], [profile?.inventory]);

  const openableCount = Math.max(0, unlockedSlots - inventory.length);

  const visibleItems = useMemo(
    () =>
      inventory.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        iconPath: item.iconPath || "/itens/general/unknown.png",
        gameId: "general",
      })),
    [inventory],
  );

  const selectedItem = selectedSlot !== null ? inventory[selectedSlot] : null;

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

    if (ok) {
      setFeedback(`Sold ${item.name} for ${payout.toLocaleString("pt-BR")} coins.`);
      setSelectedSlot(null);
      setContextMenu(null);
    } else {
      setFeedback("Could not sell item right now.");
    }
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

    if (ok) {
      setFeedback(`${item.name} used. +1 ticket added.`);
      setSelectedSlot(null);
      setContextMenu(null);
    } else {
      setFeedback("Could not use item right now.");
    }
  };

  const onDropToSlot = async (targetSlot: number) => {
    if (draggingSlot === null || draggingSlot === targetSlot || !profile) {
      setDraggingSlot(null);
      return;
    }

    if (targetSlot >= inventory.length || draggingSlot >= inventory.length) {
      setDraggingSlot(null);
      return;
    }

    const nextInventory = [...inventory];
    const temp = nextInventory[draggingSlot];
    nextInventory[draggingSlot] = nextInventory[targetSlot];
    nextInventory[targetSlot] = temp;

    const ok = await saveProfile({ inventory: nextInventory });
    if (!ok) {
      setFeedback("Could not move item right now.");
    }

    setDraggingSlot(null);
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

    setContextMenu(null);
  };

  const openLootbox = async () => {
    if (!profile || opening) {
      return;
    }

    if (profile.keys <= 0) {
      setFeedback("You need at least 1 key.");
      return;
    }

    if (openableCount <= 0) {
      setFeedback("Inventory full. Free a slot before opening.");
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

  const upgradeToVip = async () => {
    setExpanding(true);
    await saveProfile({ vipInventory: true, inventorySlots: totalSlots });
    setExpanding(false);
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Inventory</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Minecraft-style Inventory</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            3x3 base grid. Unlock extra slots if you are VIP.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Loot Coins</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">{profile.lootCoins.toLocaleString("pt-BR")}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Available balance for marketplace purchases.</p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Tickets</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#8dd0ff]">{profile.tickets}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Use for roulettes, rewards, and seasonal perks.</p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#f7ba2c]">Keys</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffd76a]">{profile.keys}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Required to open chests and special rewards.</p>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <span className="ml-2 text-xs uppercase tracking-[0.16em] text-[#9fb8db]">
                      {lastDropRarity}
                    </span>
                  </>
                ) : (
                  "Use a key to roll your next item."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="loot-title text-3xl font-black">Item grid</h2>
            <p className="loot-muted text-sm">
              Slots unlocked: <span className="font-black text-[#ffcf57]">{unlockedSlots}</span> / {totalSlots}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-[21rem]">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const item = visibleItems[index];
              const isLocked = index >= unlockedSlots;
              const rarityBorder = item ? wowRarityBorder[item.rarity] || "border-[#d6d6d6]/25" : "border-[#d6d6d6]/25";
              const rarityHoverBg = item ? wowRarityHoverBackground[item.rarity] || "" : "";
              const rarityHoverGlow = item ? wowRarityHoverGlow[item.rarity] || "" : "";

              return (
                <div
                  key={`slot-${index}`}
                  className={`group relative aspect-square overflow-visible rounded-md border p-1 transition-colors duration-300 ${
                    isLocked
                      ? "border-[#772e2e] bg-[#2a1010]/80"
                      : `${rarityBorder} ${rarityHoverBg} bg-[#0f1a27]/90 ${item ? "inv-slot-has-item" : ""}`
                  }`}
                  title={isLocked ? "Locked slot" : undefined}
                  onClick={() => {
                    if (!isLocked && item) {
                      setSelectedSlot(index);
                    }
                  }}
                  onContextMenu={(event) => {
                    if (!item || isLocked) {
                      return;
                    }

                    event.preventDefault();
                    setSelectedSlot(index);
                    setContextMenu({ x: event.clientX, y: event.clientY, slotIndex: index });
                  }}
                  draggable={Boolean(item && !isLocked)}
                  onDragStart={() => {
                    if (!item || isLocked) {
                      return;
                    }

                    setDraggingSlot(index);
                  }}
                  onDragOver={(event) => {
                    if (!isLocked) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => void onDropToSlot(index)}
                  onDragEnd={() => setDraggingSlot(null)}
                >
                  {item && !isLocked ? (
                    <>
                      <div
                        className={`relative h-full w-full rounded-sm bg-[#101826] transition-all duration-300 group-hover:brightness-115 ${rarityHoverGlow}`}
                      >
                        <Image
                          src={item.iconPath}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <span
                          aria-hidden
                          className={`inv-radial-overlay inv-radial-${item.rarity} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                        />
                      </div>
                      <div className="pointer-events-none absolute bottom-1 right-1 rounded border border-[#ffffff1a] bg-[#04070d]/80 px-1.5 py-[1px] text-[10px] font-bold text-[#ffcf57]">
                        {(rarityValue[item.rarity] ?? 0).toLocaleString("pt-BR")}
                      </div>
                      <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 rounded border border-[#ffffff1f] bg-[#05070b]/95 px-2 py-1 text-xs font-bold opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100 whitespace-nowrap">
                        <span className={wowRarityColor[item.rarity] || "text-white"}>{item.name}</span>
                      </div>
                    </>
                  ) : isLocked ? (
                    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff9b9b]">
                      VIP
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8498]">
                      Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedItem ? (
            <div className="mt-5 rounded-xl border border-[#ffffff18] bg-[#08111f]/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9fb8db]">Quick actions</p>
              <p className="mt-2 text-sm text-[#dbe6fa]">
                Selected: <span className={wowRarityColor[selectedItem.rarity]}>{selectedItem.name}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void consumeItem(selectedSlot as number)}
                  className="loot-gold-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em]"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => void sellItem(selectedSlot as number)}
                  className="loot-secondary-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em]"
                >
                  Sell
                </button>
                <button
                  type="button"
                  onClick={() => void createTradeOffer(selectedSlot as number)}
                  className="loot-secondary-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em]"
                >
                  Trade
                </button>
              </div>
            </div>
          ) : null}

          {feedback ? <p className="mt-4 text-sm font-semibold text-[#9ed5ff]">{feedback}</p> : null}

          {contextMenu ? (
            <div
              className="fixed z-50 min-w-[160px] rounded-lg border border-[#ffffff1f] bg-[#060d17]/95 p-1 shadow-2xl"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#d7e6ff] hover:bg-[#0d1f37]"
                onClick={() => void consumeItem(contextMenu.slotIndex)}
              >
                Use
              </button>
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#ffd8ad] hover:bg-[#2d1a08]"
                onClick={() => void sellItem(contextMenu.slotIndex)}
              >
                Sell
              </button>
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#cde8ff] hover:bg-[#102943]"
                onClick={() => void createTradeOffer(contextMenu.slotIndex)}
              >
                Trade
              </button>
            </div>
          ) : null}

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#7f93b4]">
            Drag and drop items to reorder occupied slots.
          </p>

          {!isVip ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="loot-muted text-sm">Upgrade to VIP to unlock extra slots (up to 15).</p>
              <button
                type="button"
                onClick={() => void upgradeToVip()}
                disabled={expanding}
                className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {expanding ? "Unlocking..." : "Unlock VIP slots"}
              </button>
            </div>
          ) : (
            <p className="mt-6 text-sm font-semibold text-emerald-400">VIP slots unlocked.</p>
          )}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
