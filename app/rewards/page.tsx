"use client";

import Link from "next/link";
import { CalendarClock, Crown, Gem, Gift, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

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
  const nextReward = buildLevelReward(progress.nextLevel, "next-preview");
  const nodes = buildRewardTrack(progress.level, profile?.highestRewardedLevel ?? 1, 15);
  const checkpoints = [1, 5, 10, 15, 20];

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_1.25fr_0.9fr] lg:items-center">
            <div className="space-y-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Seasonal Rewards</p>
              <h1 className="loot-title text-3xl font-black leading-none sm:text-4xl">Battle Pass</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="theme-pill-accent rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">Level {progress.level}</span>
                <span className="theme-pill-warn rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">{progress.xpToNextLevel.toFixed(2)} XP remaining</span>
              </div>

              <div className="theme-surface-soft rounded-2xl border border-white/10 px-4 py-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Next reward</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-2xl leading-none">{nextReward.icon}</span>
                  <div>
                    <p className="text-sm font-black text-[color:var(--text-main)]">{nextReward.shortLabel}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[color:var(--accent)]">{nextReward.badge}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Progress</p>
                  <p className="text-2xl font-black text-[color:var(--text-main)]">{progress.xpCents.toFixed(2)} / {LEVEL_XP_REQUIREMENT} XP</p>
                </div>
                <p className="text-2xl font-black text-[color:var(--accent)]">{progress.progressPercent.toFixed(1)}%</p>
              </div>

              <div className="theme-progress-track relative h-5 overflow-hidden rounded-full border border-white/10">
                <div className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:22px_100%]" />
                <div
                  className="reward-progress-glow h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress.progressPercent}%` }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.64rem] font-bold uppercase tracking-[0.13em] text-[color:var(--text-muted)]">
                {checkpoints.map((checkpoint) => (
                  <span
                    key={checkpoint}
                    className={`rounded-full border px-2 py-1 ${
                      progress.level >= checkpoint
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/14 text-[color:var(--accent)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    Lv {checkpoint}
                  </span>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <article className="theme-surface-soft rounded-xl border border-white/10 px-3 py-2">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">XP gain</p>
                  <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">$1 = {XP_PER_USD} XP</p>
                </article>
                <article className="theme-surface-soft rounded-xl border border-white/10 px-3 py-2">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">Remaining</p>
                  <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">${formatMoneyUsd(progress.spendToNextLevelUsd)}</p>
                </article>
                <article className="theme-surface-soft rounded-xl border border-white/10 px-3 py-2">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">Next level</p>
                  <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">Level {progress.nextLevel}</p>
                </article>
              </div>
            </div>

            <div className="grid gap-2">
              <article className="theme-surface-soft rounded-2xl border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <Crown className="h-4 w-4" />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]">Profile Level</p>
                </div>
                <p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{profile?.level ?? progress.level}</p>
              </article>

              <article className="theme-surface-soft rounded-2xl border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]">XP Multiplier</p>
                </div>
                <p className="mt-2 text-lg font-black text-[color:var(--text-main)]">x1.00 Base</p>
              </article>

              <article className="theme-surface-soft rounded-2xl border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <CalendarClock className="h-4 w-4" />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]">Season Status</p>
                </div>
                <p className="mt-2 text-sm font-black text-[color:var(--text-main)]">Nightfall Active</p>
                <p className="mt-1 text-[0.68rem] font-semibold text-[color:var(--text-muted)]">Ends in 23 days</p>
              </article>

              <article className="theme-surface-soft rounded-2xl border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <Gem className="h-4 w-4" />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]">Rarity Focus</p>
                </div>
                <p className="mt-2 text-sm font-black text-[#8b5cf6]">Epic Drop Window</p>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="loot-panel overflow-hidden rounded-[1.8rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">Reward Road</h2>
              <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Live progression
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Hover nodes for details. Milestones and premium rewards are highlighted.</p>
            <div className="mt-4">
              <RewardTrack nodes={nodes} />
            </div>
          </article>

          <article className="loot-panel rounded-[1.8rem] p-5 sm:p-6">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">System Intel</p>
            <div className="mt-4 grid gap-3">
              <div className="theme-surface-soft rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]"><Sparkles className="h-4 w-4" /><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">XP Formula</p></div>
                <p className="mt-2 text-lg font-black text-[color:var(--text-main)]">$1 = {XP_PER_USD} XP</p>
              </div>

              <div className="theme-surface-soft rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]"><ShieldCheck className="h-4 w-4" /><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">Level Requirement</p></div>
                <p className="mt-2 text-lg font-black text-[color:var(--text-main)]">{LEVEL_XP_REQUIREMENT} XP / Level</p>
              </div>

              <div className="theme-surface-soft rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]"><Gift className="h-4 w-4" /><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">Milestones</p></div>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Every 5 levels bigger rewards, every 10 levels premium bundles.</p>
              </div>

              <div className="theme-surface-soft rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 text-[color:var(--accent)]"><CalendarClock className="h-4 w-4" /><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">Season Status</p></div>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Nightfall season running with boosted milestone drops.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="loot-panel rounded-[1.8rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Upcoming Rewards</h2>
            <div className="flex flex-wrap gap-2">
              {rarityLegend.map((item) => (
                <span key={item.label} className="theme-surface-soft inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--text-main)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => {
              const level = progress.level + idx + 1;
              const reward = buildLevelReward(level, `preview-${level}`);

              return (
                <article key={level} className="theme-surface-soft rounded-2xl border border-white/10 p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-[color:var(--accent)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.24)]">
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

        <section className="grid gap-3 lg:grid-cols-4">
          <article className="theme-surface-soft rounded-2xl border border-white/10 p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">Recent unlocks</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">{Math.max(0, (profile?.highestRewardedLevel ?? progress.level) - 1)}</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">Rewards claimed this season</p>
          </article>

          <article className="theme-surface-soft rounded-2xl border border-white/10 p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">Season countdown</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">23d 14h</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">Until season reset</p>
          </article>

          <article className="theme-surface-soft rounded-2xl border border-white/10 p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">XP boost event</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">+20% Weekend</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">Starts in 2 days</p>
          </article>

          <article className="theme-surface-soft rounded-2xl border border-white/10 p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">Daily bonus</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">Streak x3</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">Claim to keep multiplier alive</p>
          </article>
        </section>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Inventory
          </Link>
          <Link href="/rewards/chests" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
            Chests
          </Link>
        </div>
      </main>
    </div>
  );
}
