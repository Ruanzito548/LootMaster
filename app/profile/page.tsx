"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HeroLevelCard } from "../components/progression/hero-level-card";
import { MainStatsGrid } from "../components/progression/main-stats-grid";
import { RecentUnlocks } from "../components/progression/recent-unlocks";
import { RewardTrack } from "../components/progression/reward-track";
import { buildLevelReward, buildRewardTrack, calculateLevelProgress, formatMoneyUsd } from "../../lib/level-rewards";
import { defaultCoverURL, defaultPhotoURL } from "../../lib/profile-data";
import { useProfileSession } from "./use-profile-session";

export default function ProfilePage() {
  const { status, profile, error, saveProfile, signOutUser } = useProfileSession();
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [coverDraft, setCoverDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);

  const resolvedPhoto = photoDraft ?? profile?.photoURL ?? defaultPhotoURL;
  const resolvedCover = coverDraft ?? profile?.coverURL ?? defaultCoverURL;
  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const nextReward = buildLevelReward(progress.nextLevel, `${profile?.uid ?? "profile"}-preview`);
  const levelUpReward = profile?.lastLevelUpLevel ? buildLevelReward(profile.lastLevelUpLevel, `${profile.uid}-level-up`) : null;

  const rewardTrackNodes = useMemo(
    () => buildRewardTrack(progress.level, profile?.highestRewardedLevel ?? 1, 13),
    [progress.level, profile?.highestRewardedLevel],
  );

  const saveAppearance = async () => {
    setSaving(true);
    setFeedback(null);

    const ok = await saveProfile({
      photoURL: resolvedPhoto || defaultPhotoURL,
      coverURL: resolvedCover || defaultCoverURL,
    });

    setFeedback(ok ? "Saved" : "Could not save right now.");
    setSaving(false);
  };

  useEffect(() => {
    if (!profile?.uid || !profile.lastProgressAt || profile.lastXpGain <= 0) {
      return;
    }

    const key = `xp-popup:${profile.uid}:${profile.lastProgressAt}`;
    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "1");
    const openTimeout = window.setTimeout(() => setShowXpPopup(true), 0);

    const timeout = window.setTimeout(() => setShowXpPopup(false), 2800);
    return () => {
      window.clearTimeout(openTimeout);
      window.clearTimeout(timeout);
    };
  }, [profile?.uid, profile?.lastProgressAt, profile?.lastXpGain]);

  useEffect(() => {
    if (!profile?.uid || !profile.lastLevelUpAt || profile.lastLevelUpLevel <= 0) {
      return;
    }

    const key = `level-modal:${profile.uid}:${profile.lastLevelUpAt}`;
    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "1");

    const openTimeout = window.setTimeout(() => setShowLevelModal(true), 0);
    return () => window.clearTimeout(openTimeout);
  }, [profile?.uid, profile?.lastLevelUpAt, profile?.lastLevelUpLevel]);

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading profile...</p>
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold">
                Login
              </Link>
              <Link href="/" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
                Home
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 pb-20 pt-8 sm:px-6 lg:px-8">
        <HeroLevelCard
          username={profile.username}
          email={profile.email}
          avatarUrl={resolvedPhoto || defaultPhotoURL}
          coverUrl={resolvedCover || defaultCoverURL}
          progress={progress}
          nextReward={nextReward}
        />

        <MainStatsGrid progress={progress} lootCoins={profile.lootCoins} rewardsUnlocked={profile.highestRewardedLevel - 1} />

        <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Reward Track</h2>
            <span className="theme-pill-accent rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em]">
              Level {progress.level}
            </span>
          </div>
          <div className="mt-6">
            <RewardTrack nodes={rewardTrackNodes} />
          </div>
        </section>

        <RecentUnlocks items={profile.recentUnlocks} />

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">Daily streak</p>
            <p className="mt-3 text-3xl font-black text-[color:var(--accent)]">{profile.dailyStreak} days</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Next bonus: +20 XP</p>
          </article>

          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--button-hover)]">Season track</p>
            <p className="mt-3 text-3xl font-black text-[color:var(--button-hover)]">Tier {profile.seasonTrackTier}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">2 premium nodes ahead</p>
          </article>

          <article className="loot-panel rounded-2xl p-5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-main)]">Achievements</p>
            <p className="mt-3 text-3xl font-black text-[color:var(--text-main)]">{profile.achievementPoints}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">Integrated with profile progression</p>
          </article>
        </section>

        <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="loot-title text-2xl font-black sm:text-3xl">Account</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                Inventory
              </Link>
              <Link href="/rewards" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                Rewards
              </Link>
              <Link href="/profile/wallet-history" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                Wallet
              </Link>
              <Link href="/profile/history" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                History
              </Link>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <label className="grid gap-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Avatar URL
              <input
                value={resolvedPhoto}
                onChange={(event) => setPhotoDraft(event.target.value)}
                placeholder="https://..."
                className="loot-input rounded-xl px-4 py-3 text-sm font-semibold"
              />
            </label>

            <label className="grid gap-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Cover URL
              <input
                value={resolvedCover}
                onChange={(event) => setCoverDraft(event.target.value)}
                placeholder="https://..."
                className="loot-input rounded-xl px-4 py-3 text-sm font-semibold"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveAppearance()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {feedback ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">{feedback}</p> : null}
            {error ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-400">{error}</p> : null}
          </div>
        </section>

        {showXpPopup ? (
          <div className="xp-popup pointer-events-none fixed right-5 top-5 z-50 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--navbar-bg)] px-4 py-3 shadow-[0_18px_45px_var(--shadow-color)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">XP Gained</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">+{profile.lastXpGain.toFixed(2)} XP</p>
            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              ${formatMoneyUsd(profile.lastSpendUsd)} purchase
            </p>
          </div>
        ) : null}

        {showLevelModal && levelUpReward ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070f]/78 p-5">
            <div className="reward-claim-pop loot-panel w-full max-w-md rounded-[2rem] p-7">
              <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Level up</p>
              <h3 className="mt-3 text-center text-4xl font-black text-[color:var(--text-main)]">Level {profile.lastLevelUpLevel}</h3>
              <div className="theme-surface-soft mt-6 rounded-2xl p-5 text-center">
                <p className="text-4xl leading-none">{levelUpReward.icon}</p>
                <p className="mt-3 text-xl font-black text-[color:var(--text-main)]">{levelUpReward.title}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">{levelUpReward.badge} Reward Claimed</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelModal(false)}
                className="loot-gold-button mt-6 w-full rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
