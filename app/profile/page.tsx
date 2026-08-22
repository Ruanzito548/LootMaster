"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, UserRound, Wallet as WalletIcon } from "lucide-react";

import { buildLevelReward, calculateLevelProgress, formatMoneyUsd } from "../../lib/level-rewards";
import { defaultCoverURL, defaultPhotoURL } from "../../lib/profile-data";
import HistoryClient from "./history/history-client";
import InventoryPage from "./inventory/page";
import { useProfileSession } from "./use-profile-session";

type ProfileTab = "inventory" | "wallet" | "account";

const TABS: { id: ProfileTab; label: string; icon: typeof Package }[] = [
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
  { id: "account", label: "Account", icon: UserRound },
];

function isProfileTab(value: string): value is ProfileTab {
  return value === "inventory" || value === "wallet" || value === "account";
}

export default function ProfilePage() {
  const { status, profile, error, saveProfile, signOutUser } = useProfileSession();
  const [activeTab, setActiveTab] = useState<ProfileTab>("inventory");
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [coverDraft, setCoverDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);

  const resolvedPhoto = photoDraft ?? profile?.photoURL ?? defaultPhotoURL;
  const resolvedCover = coverDraft ?? profile?.coverURL ?? defaultCoverURL;
  const progress = calculateLevelProgress(profile?.totalSpentCents ?? 0);
  const rpgLevel = Math.max(1, profile?.rpgLevel ?? 1);
  const levelUpReward = profile?.lastLevelUpLevel ? buildLevelReward(profile.lastLevelUpLevel, `${profile.uid}-level-up`) : null;

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
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (isProfileTab(hash)) {
        setActiveTab(hash);
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const selectTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
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
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
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
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
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
    <div className="loot-shell relative isolate overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <Image src="/inventario/bgtotal.png" alt="" fill sizes="100vw" priority className="object-cover object-top" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-5 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedPhoto}
                alt="Profile avatar"
                className="h-16 w-16 rounded-2xl border border-[color:var(--border-color)] object-cover shadow-[0_12px_30px_var(--shadow-color)]"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="loot-title text-2xl font-black leading-none sm:text-3xl">{profile.username}</h1>
                  <span className="theme-pill-accent font-data rounded-full px-3 py-1 text-xs font-bold">Level {progress.level}</span>
                </div>
                <p className="loot-muted mt-2 text-xs uppercase tracking-[0.14em]">{profile.email || "No email"}</p>
              </div>
            </div>

            <div className="grid gap-2 lg:border-l lg:border-white/10 lg:px-6">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">XP Progress</p>
              <div className="flex items-end justify-between gap-3">
                <p className="font-data text-xl font-black text-[color:var(--text-main)]">
                  {progress.xpCents.toFixed(0)} / {progress.nextLevelXpCents.toFixed(0)} XP
                </p>
                <p className="font-data text-xl font-black text-[color:var(--accent)]">{progress.progressPercent.toFixed(1)}%</p>
              </div>
              <div className="theme-progress-track h-3 overflow-hidden rounded-full">
                <div className="reward-progress-glow h-full rounded-full" style={{ width: `${progress.progressPercent}%` }} />
              </div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                {progress.xpToNextLevel.toFixed(0)} XP to next level
              </p>
            </div>

            <div className="grid gap-1 lg:border-l lg:border-[#d4af5a]/45 lg:px-6">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Wallet Balance</p>
              <p className="text-2xl font-black text-[#ffcf67]">{profile.lootCoins.toLocaleString("en-US")} LC</p>
              <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Title</p>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[color:var(--text-main)]">Level {rpgLevel}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-1 rounded-xl border border-[color:var(--border-color)]/45 bg-black/20 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition-colors ${
                activeTab === id
                  ? "border-b-2 border-[color:var(--accent)] bg-white/5 text-[color:var(--accent)]"
                  : "text-[color:var(--text-muted)] hover:bg-white/5 hover:text-[color:var(--text-main)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</section>
        ) : null}

        {activeTab === "inventory" ? <InventoryPage /> : null}
        {activeTab === "wallet" ? <HistoryClient /> : null}

        {activeTab === "account" ? (
          <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">Account</h2>
              <div className="flex flex-wrap gap-2">
                <Link href="/rewards" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  Rewards
                </Link>
                <Link href="/profile/withdraw" className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  Withdraw
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
            </div>
          </section>
        ) : null}

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
                <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-[#0b1220]/80 ring-1 ring-[color:var(--border-color)]">
                  <Image
                    src={levelUpReward.grantedItems[0]?.iconPath ?? "/baus/epico.png"}
                    alt={levelUpReward.title}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
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
