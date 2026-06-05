"use client";

import Link from "next/link";
import { useState } from "react";

import { buildLevelReward, calculateLevelProgress, formatMoneyUsd } from "../../lib/level-rewards";
import { defaultCoverURL, defaultPhotoURL } from "../../lib/profile-data";
import { useProfileSession } from "./use-profile-session";

export default function ProfilePage() {
  const { status, profile, error, saveProfile, signOutUser } = useProfileSession();
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [coverDraft, setCoverDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resolvedPhoto = photoDraft ?? profile?.photoURL ?? defaultPhotoURL;
  const resolvedCover = coverDraft ?? profile?.coverURL ?? defaultCoverURL;
  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const nextReward = buildLevelReward(progress.nextLevel, `${profile?.uid ?? "profile"}-preview`);

  const saveAppearance = async () => {
    setSaving(true);
    setFeedback(null);

    const ok = await saveProfile({
      photoURL: resolvedPhoto || defaultPhotoURL,
      coverURL: resolvedCover || defaultCoverURL,
    });

    setFeedback(ok ? "Profile photo and cover updated." : "Could not save right now.");
    setSaving(false);
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading your profile...</p>
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
            <h1 className="loot-title text-3xl font-black">You need to log in</h1>
            <p className="loot-muted mt-4 text-sm">Sign in with your Google account to access your profile.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold">
                Go to login
              </Link>
              <Link href="/" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Profile</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Welcome back, {profile.username}</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Track your level, unlock rewards automatically, and keep your account visual fully custom.
          </p>
          {error ? <p className="text-sm font-semibold text-rose-400">{error}</p> : null}
        </div>

        <section className="loot-panel relative mt-8 overflow-hidden rounded-[2.35rem]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${resolvedCover || defaultCoverURL})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,22,0.15),rgba(7,12,22,0.92)_80%)]" />

          <div className="relative h-52 border-b border-white/10 bg-[radial-gradient(circle_at_10%_20%,rgba(77,198,255,0.18),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(255,205,80,0.12),transparent_22%)]" />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:p-8">
            <div className="flex items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedPhoto || defaultPhotoURL}
                alt="Profile avatar"
                className="h-28 w-28 rounded-[1.65rem] border border-[#ffffff1f] object-cover shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
              />
              <div>
                <p className="loot-kicker text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#8dd0ff]">Buyer profile</p>
                <h2 className="loot-title mt-2 text-3xl font-black leading-none sm:text-4xl">{profile.username}</h2>
                <p className="loot-muted mt-2 text-sm">{profile.email || "No email registered"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-[#ffffff14] bg-[#09111f]/80 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">Level</p>
                <p className="mt-3 text-3xl font-black text-[#8dd0ff]">{progress.level}</p>
              </div>
              <div className="rounded-[1.35rem] border border-[#ffffff14] bg-[#09111f]/80 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">Spent</p>
                <p className="mt-3 text-3xl font-black text-[#ffcf57]">${formatMoneyUsd(progress.totalSpentUsd)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-[#ffffff14] bg-[#09111f]/80 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">Next reward</p>
                <p className="mt-3 text-lg font-black text-[#dff7ff]">{nextReward.title}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="loot-badge-blue rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                XP {(progress.xpCents / 100).toFixed(2)} / {(progress.nextLevelXpCents / 100).toFixed(2)}
              </span>
              <span className="rounded-full border border-[#ffcf57]/25 bg-[#ffcf57]/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffcf57]">
                {progress.progressPercent}% to level {progress.nextLevel}
              </span>
            </div>
          </div>

          <div className="relative border-t border-white/10 p-6 lg:p-8">
            <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.22em] text-[#9fb8db]">
              <span>Progress to level {progress.nextLevel}</span>
              <span>{progress.progressPercent}%</span>
            </div>
            <div className="mt-3 h-4 rounded-full bg-[#182334] p-1 shadow-inner shadow-black/30">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2a87ff_0%,#26c1ff_55%,#36ffb7_100%)] shadow-[0_0_18px_rgba(57,209,255,0.4)]"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.35rem] border border-[#ffffff12] bg-[#09111f]/70 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">XP inside level</p>
                <p className="mt-3 text-2xl font-black text-[#dff7ff]">
                  {(progress.xpCents / 100).toFixed(2)} / {(progress.nextLevelXpCents / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-[#ffffff12] bg-[#09111f]/70 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">To next level</p>
                <p className="mt-3 text-2xl font-black text-[#ffcf57]">${formatMoneyUsd(progress.spendToNextLevelCents / 100)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-[#ffffff12] bg-[#09111f]/70 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fb8db]">Reward format</p>
                <p className="mt-3 text-2xl font-black text-[#8dd0ff]">{nextReward.badge}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="loot-panel rounded-[2rem] p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#ffc94d]">Loot Coins</p>
                <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">{profile.lootCoins.toLocaleString("pt-BR")}</h2>
                <p className="loot-muted mt-4 text-sm leading-7">Current balance for marketplace purchases and withdrawals.</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#ffcf57]/20 bg-[#ffcf57]/10 px-4 py-3 text-right">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#ffcf57]">Current level</p>
                <p className="mt-2 text-3xl font-black text-[#ffcf57]">{progress.level}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/profile/withdraw" className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Withdraw
              </Link>
              <Link href="/profile/wallet-history" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Wallet history
              </Link>
              <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Inventory
              </Link>
            </div>
          </article>

          <article className="loot-panel rounded-[2rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dd0ff]">Next reward</p>
            <h2 className="loot-title mt-4 text-3xl font-black">{nextReward.title}</h2>
            <p className="loot-muted mt-4 text-base leading-7">{nextReward.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.3rem] border border-[#ffffff12] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Current progress</p>
                <p className="mt-2 text-2xl font-black text-[#8dd0ff]">{progress.progressPercent}%</p>
              </div>
              <div className="rounded-[1.3rem] border border-[#ffffff12] bg-[#09111f]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Reward type</p>
                <p className="mt-2 text-2xl font-black text-[#ffcf57]">{nextReward.badge}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dd0ff]">Inventory</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Unlimited vault</h2>
            <p className="loot-muted mt-4 text-base leading-7">All rewards are deposited directly into your inventory without slot limits.</p>
            <Link href="/profile/inventory" className="loot-secondary-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Open inventory
            </Link>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#f7ba2c]">Rewards</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Level-up roadmap</h2>
            <p className="loot-muted mt-4 text-base leading-7">Every $250 spent unlocks the next level and a new automatic reward.</p>
            <Link href="/rewards" className="loot-secondary-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              View rewards
            </Link>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="loot-title text-3xl font-black">Appearance</h2>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold"
            >
              Sign out
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              Profile photo URL
              <input
                value={resolvedPhoto}
                onChange={(event) => setPhotoDraft(event.target.value)}
                placeholder="https://..."
                className="loot-input px-4 py-3 text-sm font-semibold"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              Cover URL
              <input
                value={resolvedCover}
                onChange={(event) => setCoverDraft(event.target.value)}
                placeholder="https://..."
                className="loot-input px-4 py-3 text-sm font-semibold"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveAppearance()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save photo and cover"}
            </button>
            {feedback ? <p className="self-center text-sm font-semibold text-[#8dd0ff]">{feedback}</p> : null}
          </div>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <h2 className="loot-title text-3xl font-black">Latest activity</h2>
          <div className="mt-6 flex flex-col gap-4">
            {profile.transactions.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="loot-title text-xl font-black">{item.title}</h3>
                    <p className="loot-muted mt-1 text-xs uppercase tracking-[0.18em]">
                      {item.type} • {item.status} • {item.createdAtLabel}
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#ffcf57]">{item.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}