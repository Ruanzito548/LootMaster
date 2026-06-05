"use client";

import Link from "next/link";

import { RewardTrack } from "../components/progression/reward-track";
import { buildLevelReward, buildRewardTrack, calculateLevelProgress, formatMoneyUsd, LEVEL_XP_REQUIREMENT, XP_PER_USD } from "../../lib/level-rewards";
import { useProfileSession } from "../profile/use-profile-session";

const rarityLegend = [
  { label: "Common", color: "bg-[#9ca3af]" },
  { label: "Rare", color: "bg-[#3b82f6]" },
  { label: "Epic", color: "bg-[#a855f7]" },
  { label: "Legendary", color: "bg-[#f97316]" },
  { label: "Mythic", color: "bg-[#ef4444]" },
];

export default function RewardsPage() {
  const { profile } = useProfileSession();
  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const nodes = buildRewardTrack(progress.level, profile?.highestRewardedLevel ?? 1, 15);

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2.1rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Rewards Hub</p>
              <h1 className="loot-title mt-3 text-4xl font-black leading-none sm:text-5xl">Battle Pass Progress</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="theme-pill-accent rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em]">
                Level {progress.level}
              </span>
              <span className="theme-pill-warn rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em]">
                {progress.xpCents.toFixed(2)} / {LEVEL_XP_REQUIREMENT} XP
              </span>
            </div>
          </div>

          <div className="theme-progress-track mt-6 h-4 overflow-hidden rounded-full">
            <div
              className="reward-progress-glow h-full rounded-full"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
            <span>{progress.progressPercent.toFixed(1)}%</span>
            <span>{progress.xpToNextLevel.toFixed(2)} XP to Level {progress.nextLevel}</span>
            <span>${formatMoneyUsd(progress.spendToNextLevelUsd)} remaining</span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="loot-panel rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">Reward Road</h2>
              <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Infinite scaling
              </span>
            </div>
            <div className="mt-6">
              <RewardTrack nodes={nodes} />
            </div>
          </article>

          <article className="loot-panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">System Rules</p>
            <div className="mt-4 grid gap-3">
              <div className="theme-surface-soft rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--accent)]">XP formula</p>
                <p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">$1 = {XP_PER_USD} XP</p>
              </div>
              <div className="theme-surface-soft rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--button-hover)]">Level requirement</p>
                <p className="mt-2 text-2xl font-black text-[color:var(--button-hover)]">{LEVEL_XP_REQUIREMENT} XP</p>
              </div>
              <div className="theme-surface-soft rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-main)]">Reward cadence</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Every level, milestone at 5, premium at 10, rare bonus drops on milestones.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Rarity</h2>
            <div className="flex flex-wrap gap-2">
              {rarityLegend.map((item) => (
                <span key={item.label} className="theme-surface-soft inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--text-main)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => {
              const level = progress.level + idx + 1;
              const reward = buildLevelReward(level, `preview-${level}`);

              return (
                <article key={level} className="theme-surface-soft rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">Level {level}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl">{reward.icon}</span>
                    <p className="text-sm font-black text-[color:var(--text-main)]">{reward.shortLabel}</p>
                  </div>
                  <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">{reward.badge}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">Seasonal Track</p>
            <p className="mt-3 text-2xl font-black text-[color:var(--text-main)]">Nightfall Season</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Limited banners, cosmetics, and event keys.</p>
          </article>

          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--button-hover)]">Daily Bonus</p>
            <p className="mt-3 text-2xl font-black text-[color:var(--button-hover)]">Streak XP</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Claim daily for stacking XP boosts.</p>
          </article>

          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-main)]">Achievements</p>
            <p className="mt-3 text-2xl font-black text-[color:var(--text-main)]">Meta Goals</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Integrated with progression and reward unlocks.</p>
          </article>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Inventory
          </Link>
          <Link href="/rewards/chests" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Chests
          </Link>
          <Link href="/rewards/roulette" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Roulette
          </Link>
        </div>
      </main>
    </div>
  );
}
