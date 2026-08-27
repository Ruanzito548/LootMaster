"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const router = useRouter();
  const { profile, user, reload, status } = useProfileSession();
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-20 text-center">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--accent)]">Loading</p>
            <h1 className="loot-title text-3xl font-black sm:text-4xl">Checking your session...</h1>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-20 text-center">
          <div className="loot-panel max-w-lg rounded-[1.5rem] p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[color:var(--accent)]">Access required</p>
            <h1 className="loot-title mt-4 text-3xl font-black sm:text-4xl">Please sign in</h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
              You need to be logged in to access the rewards and battle pass page.
            </p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.16em]">
              Go to login
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
        <section className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-color)]/65 bg-[linear-gradient(120deg,rgba(21,39,56,0.94),rgba(10,15,29,0.98)_52%,rgba(30,22,42,0.94))] px-5 py-5 shadow-[0_18px_44px_rgba(0,0,0,0.38)] sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] opacity-25 [mask-image:linear-gradient(to_left,black,transparent)] lg:block">
            <Image src="/chest.png" alt="" fill sizes="320px" className="object-contain object-right" />
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr_0.95fr] lg:items-start lg:gap-0">
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

              <div className="mt-2 border-l border-[color:var(--accent)]/45 pl-4">
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

            <div className="space-y-3 pt-1 lg:border-l lg:border-white/10 lg:px-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Current XP band</p>
                  <p className="font-data text-2xl font-bold text-[color:var(--text-main)]">{progress.xpCents.toFixed(0)} / {progress.nextLevelXpCents.toFixed(0)} XP</p>
                </div>
                <p className="font-data text-2xl font-bold text-[color:var(--accent)]">{progress.progressPercent.toFixed(1)}%</p>
              </div>

              <div className="relative h-4 overflow-hidden rounded-full bg-black/40">
                <div className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_100%]" />
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#c89b3c,#d4af5a,#e6c46a,#f2d27a)] shadow-[0_0_26px_rgba(212,175,90,0.4)] transition-all duration-700" style={{ width: `${progress.progressPercent}%` }} />
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]" />
              </div>
            </div>

            <article className="border-l border-white/10 pl-4 lg:pl-6">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Next Level Chests</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">Level {nextClaimLevel} reward bundle</p>

              <div className="mt-4 grid gap-2">
                {nextReward.grantedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border-b border-white/10 px-1 py-2 last:border-b-0">
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
          <article className="overflow-hidden rounded-[1.25rem] border border-[color:var(--border-color)]/55 bg-[rgba(8,14,26,0.9)] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.28)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">Battle Pass Track</h2>
              <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">Battle Pass Timeline</span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              States: locked, available, claimed. Hover to inspect reward details.
            </p>
            <div className="mt-3">
              <RewardTrack nodes={nodes} />
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#c89b3c,#e6c46a)] transition-all duration-700"
                style={{ width: `${Math.min(100, (highestRewardedLevel / LEVEL_CAP) * 100)}%` }}
              />
            </div>
          </article>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="flex items-start gap-3 rounded-xl border border-[color:var(--border-color)]/45 bg-black/80 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent)]/15 text-lg">⭐</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--accent)]">Earn XP</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Every purchase you make grants XP to your account.</p>
            </div>
          </article>
          <article className="flex items-start gap-3 rounded-xl border border-[color:var(--border-color)]/45 bg-black/80 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7a3fa8]/15 text-lg">⬆️</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d8a8ff]">Level Up</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Gain levels and unlock better rewards on your journey.</p>
            </div>
          </article>
          <article className="flex items-start gap-3 rounded-xl border border-[color:var(--border-color)]/45 bg-black/80 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2fa36b]/15 text-lg">🎁</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8fe0b8]">Claim Rewards</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Reach the required level and claim your rewards.</p>
            </div>
          </article>
          <article className="flex items-start gap-3 rounded-xl border border-[color:var(--border-color)]/45 bg-black/80 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2d6ec7]/15 text-lg">♾️</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8fc1ff]">Permanent Progress</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Your progress is saved forever. Keep leveling up!</p>
            </div>
          </article>
        </section>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[color:var(--border-color)]/45 bg-black/80 p-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <Link href="/profile" className="rounded-lg px-4 py-2 text-[color:var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[color:var(--text-main)]">Profile</Link>
          <Link href="/profile#inventory" className="rounded-lg px-4 py-2 text-[color:var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[color:var(--text-main)]">Inventory</Link>
        </div>
      </main>
    </div>
  );
}
