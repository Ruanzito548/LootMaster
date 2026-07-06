"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { RewardTrack } from "../components/progression/reward-track";
import {
  LEVEL_CAP,
  XP_PER_USD,
  buildLevelReward,
  calculateLevelProgress,
  calculateTotalXp,
  formatMoneyUsd,
  type RewardTrackNode,
} from "../../lib/level-rewards";
import { useProfileSession } from "../profile/use-profile-session";

const rarityLegend = [
  { label: "Common", color: "bg-[#9ca3af]" },
  { label: "Rare", color: "bg-[#3b82f6]" },
  { label: "Epic", color: "bg-[#a855f7]" },
  { label: "Legendary", color: "bg-[#f59e0b]" },
  { label: "Mythic", color: "bg-[#ef4444]" },
];

function getInventoryQuantityById(inventory: Array<{ id: string; quantity: number }> | undefined, itemId: string): number {
  if (!Array.isArray(inventory)) {
    return 0;
  }

  return inventory
    .filter((item) => item.id === itemId)
    .reduce((sum, item) => sum + Math.max(0, Math.floor(item.quantity || 0)), 0);
}

export default function RewardsPage() {
  const { profile, user, reload } = useProfileSession();
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const highestRewardedLevel = Math.max(1, Math.floor(profile?.highestRewardedLevel ?? 1));
  const nodes: RewardTrackNode[] = Array.from({ length: LEVEL_CAP }, (_, index) => {
    const level = index + 1;
    const reward = buildLevelReward(level, `track-${level}`);
    const state = level <= highestRewardedLevel ? "claimed" : level <= progress.level ? "available" : "locked";

    return {
      level,
      reward,
      state,
      isMilestone: level === 10 || level === 15 || level === 20,
      isPremium: level === 10 || level === 15 || level === 20,
    };
  });

  const nextClaimLevel = Math.min(LEVEL_CAP, highestRewardedLevel + 1);
  const nextReward = buildLevelReward(nextClaimLevel, "next-claim-preview");
  const hasRemainingClaims = highestRewardedLevel < LEVEL_CAP;
  const canClaimNextReward = hasRemainingClaims && progress.level >= nextClaimLevel;

  const giftCardFragments = getInventoryQuantityById(profile?.inventory, "gift-card-fragment");
  const lifetimeSpentUsd = (profile?.totalSpentCents ?? 0) / 100;
  const lifetimeXp = profile?.lifetimeXp ?? calculateTotalXp(profile?.totalSpentCents ?? 0);
  const rewardsClaimed = profile?.totalRewardsClaimed ?? Math.max(0, (profile?.highestRewardedLevel ?? progress.level) - 1);
  const completionPercent = Math.min(100, Math.max(0, (progress.level / LEVEL_CAP) * 100));

  const claimNextReward = async () => {
    if (!user || claimBusy || !canClaimNextReward) {
      return;
    }

    setClaimBusy(true);
    setClaimFeedback(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile/rewards/claim-next", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { error?: string; claimedLevel?: number; rewardTitle?: string };

      if (!response.ok) {
        setClaimFeedback(payload.error ?? "Could not claim reward.");
        return;
      }

      setClaimFeedback(`Claimed level ${payload.claimedLevel ?? nextClaimLevel}: ${payload.rewardTitle ?? "reward"}.`);
      reload();
    } catch {
      setClaimFeedback("Could not claim reward right now.");
    } finally {
      setClaimBusy(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="loot-panel relative overflow-hidden rounded-[2rem] p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(88,182,255,0.22),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(255,163,102,0.2),transparent_32%),radial-gradient(circle_at_48%_100%,rgba(189,106,255,0.2),transparent_35%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_1.05fr_0.9fr] lg:items-stretch">
            <div className="space-y-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Loyalty Progression</p>
              <h1 className="loot-title text-3xl font-black leading-none sm:text-5xl">Permanent Battle Pass</h1>
              <p className="max-w-xl text-sm leading-7 text-[color:var(--text-muted)]">
                Evolve your account like an MMO character: each purchase grants XP, advances your level, and unlocks long-term rewards.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="theme-pill-accent rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">Level {progress.level}</span>
                <span className="theme-pill-warn rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">
                  {progress.xpToNextLevel.toFixed(0)} XP to next level
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[rgba(8,14,28,0.72)] p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Next Claim Reward</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-3xl leading-none">{nextReward.icon}</span>
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">Level {nextClaimLevel}</p>
                    <p className="text-sm font-black text-[color:var(--text-main)]">{nextReward.shortLabel}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[color:var(--accent)]">{nextReward.badge}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-[rgba(8,14,26,0.65)] p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Current XP band</p>
                  <p className="text-2xl font-black text-[color:var(--text-main)]">{progress.xpCents.toFixed(0)} / {progress.nextLevelXpCents.toFixed(0)} XP</p>
                </div>
                <p className="text-2xl font-black text-[color:var(--accent)]">{progress.progressPercent.toFixed(1)}%</p>
              </div>

              <div className="relative h-5 overflow-hidden rounded-full border border-cyan-200/20 bg-black/40">
                <div className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_100%]" />
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#58b6ff,#6ee7f7,#a78bfa,#f59e0b)] shadow-[0_0_26px_rgba(88,182,255,0.45)] transition-all duration-700" style={{ width: `${progress.progressPercent}%` }} />
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]" />
              </div>
            </div>

            <article className="rounded-2xl border border-white/10 bg-[rgba(8,14,28,0.72)] p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Next Level Chests</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">Level {nextClaimLevel} reward bundle</p>

              <div className="mt-4 grid gap-2">
                {nextReward.grantedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Image src="/chest.png" alt="Chest" width={22} height={22} className="h-5 w-5 object-contain" />
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-main)]">{item.quantity}x {item.name}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void claimNextReward()}
                disabled={!canClaimNextReward || claimBusy || !user}
                className="loot-gold-button mt-4 w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
              >
                {claimBusy
                  ? "Claiming..."
                  : canClaimNextReward
                    ? `Claim Level ${nextClaimLevel} Reward`
                    : hasRemainingClaims
                      ? `Reach Level ${nextClaimLevel} to Claim`
                      : "All Rewards Claimed"}
              </button>

              <p className="mt-2 text-[0.68rem] font-semibold text-[color:var(--text-muted)]">
                {hasRemainingClaims
                  ? `Each US$1 spent gives ${XP_PER_USD} XP. Reach level ${nextClaimLevel} to unlock this claim.`
                  : "You have claimed all rewards up to level 20."}
              </p>
              {claimFeedback ? (
                <p className="mt-2 text-[0.68rem] font-semibold text-[color:var(--accent)]">{claimFeedback}</p>
              ) : null}
            </article>
          </div>
        </section>

        <section>
          <article className="loot-panel overflow-hidden rounded-[1.8rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">Battle Pass Track</h2>
              <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">Battle Pass Timeline</span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              States: locked, available, claimed. Hover to inspect reward details.
            </p>
            <div className="mt-4">
              <RewardTrack nodes={nodes} />
            </div>
          </article>
        </section>

        <section className="loot-panel rounded-[1.8rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Progress Dashboard</h2>
            <div className="flex flex-wrap gap-2">
              {rarityLegend.map((item) => (
                <span key={item.label} className="theme-surface-soft inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--text-main)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Current Level</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{progress.level}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Current XP</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(progress.totalXp).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">XP Until Next</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{progress.xpToNextLevel.toFixed(0)}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Lifetime Spent</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">${formatMoneyUsd(lifetimeSpentUsd)}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Lifetime XP</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(lifetimeXp).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Loot Coins Earned</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(profile?.lootCoinsEarned ?? 0).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Loot Coins Spent</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(profile?.lootCoinsSpent ?? 0).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Gift Card Fragments</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{giftCardFragments.toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Gift Cards Crafted</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(profile?.giftCardsCrafted ?? 0).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Total Rewards Claimed</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{Math.floor(rewardsClaimed).toLocaleString("en-US")}</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Completion %</p><p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{completionPercent.toFixed(1)}%</p></article>
            <article className="theme-surface-soft rounded-2xl border border-white/10 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">Next Reward</p><p className="mt-2 text-base font-black text-[color:var(--text-main)]">{nextReward.shortLabel}</p></article>
          </div>
        </section>

        <section className="loot-panel rounded-[1.8rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Unlocked Reward History</h2>
            <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">Recent Unlocks</span>
          </div>

          {(profile?.recentUnlocks ?? []).length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(profile?.recentUnlocks ?? []).slice(0, 12).map((entry) => (
                <article key={entry.id} className="theme-surface-soft rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-[color:var(--text-main)]">{entry.icon} {entry.title}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[color:var(--accent)]">Lvl {entry.level}</p>
                  </div>
                  <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{entry.rarity}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-[color:var(--text-muted)]">No unlocked rewards yet. Keep progressing in the Battle Pass.</p>
          )}
        </section>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Profile</Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Inventory</Link>
          <Link href="/marketplace" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Marketplace</Link>
        </div>
      </main>
    </div>
  );
}
