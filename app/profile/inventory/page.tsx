"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "../use-profile-session";
import { subscribeToInventoryItems, type InventoryCatalogItem } from "../../../lib/inventory-items";

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

const totalSlots = 15;
const baseSlots = 9;

export default function InventoryPage() {
  const { status, profile, saveProfile } = useProfileSession();
  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItem[]>([]);
  const [expanding, setExpanding] = useState(false);

  useEffect(() => subscribeToInventoryItems(setCatalogItems), []);

  const isVip = profile?.vipInventory === true;
  const unlockedSlots = isVip ? totalSlots : Math.max(baseSlots, profile?.inventorySlots ?? baseSlots);

  const visibleItems = useMemo(() => {
    if (catalogItems.length > 0) {
      return catalogItems;
    }

    return profile?.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      iconPath: item.iconPath || "/itens/general/unknown.png",
      gameId: "general",
    })) ?? [];
  }, [catalogItems, profile?.inventory]);

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
