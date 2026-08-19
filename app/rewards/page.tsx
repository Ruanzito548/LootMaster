"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { getChestImagePath } from "@/lib/chests";
import { RewardTrack } from "../components/progression/reward-track";
import {
  LEVEL_CAP,
  XP_PER_USD,
  buildLevelReward,
  calculateLevelProgress,
  type RewardTrackNode,
} from "../../lib/level-rewards";
import { useProfileSession } from "../profile/use-profile-session";

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
                <span className="theme-pill-accent font-data rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em]">Level {progress.level}</span>
                <span className="theme-pill-warn font-data rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em]">
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
                  <p className="font-data text-2xl font-bold text-[color:var(--text-main)]">{progress.xpCents.toFixed(0)} / {progress.nextLevelXpCents.toFixed(0)} XP</p>
                </div>
                <p className="font-data text-2xl font-bold text-[color:var(--accent)]">{progress.progressPercent.toFixed(1)}%</p>
              </div>

              <div className="relative h-5 overflow-hidden rounded-full border border-[#d4af5a]/25 bg-black/40">
                <div className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_100%]" />
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#c89b3c,#d4af5a,#e6c46a,#f2d27a)] shadow-[0_0_26px_rgba(212,175,90,0.4)] transition-all duration-700" style={{ width: `${progress.progressPercent}%` }} />
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]" />
              </div>
            </div>

            <article className="rounded-2xl border border-white/10 bg-[rgba(8,14,28,0.72)] p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Next Level Chests</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">Level {nextClaimLevel} reward bundle</p>

              <div className="mt-4 grid gap-2">
                {nextReward.grantedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Image src={item.iconPath ?? getChestImagePath("common")} alt={item.name} width={22} height={22} className="h-5 w-5 object-contain" />
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

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Profile</Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Inventory</Link>
          <Link href="/marketplace" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Marketplace</Link>
        </div>
      </main>
    </div>
  );
}
