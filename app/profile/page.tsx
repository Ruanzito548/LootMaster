"use client";

import Link from "next/link";
import { useState } from "react";

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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Profile</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Your Gold Account</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Edit your cover and avatar, check your Loot Coins balance, and track buys and sales.
          </p>
          {error ? <p className="text-sm font-semibold text-rose-400">{error}</p> : null}
        </div>

        <section className="loot-panel mt-8 overflow-hidden rounded-[2rem] p-0">
          <div className="h-44 w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolvedCover || defaultCoverURL})` }} />
          <div className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedPhoto || defaultPhotoURL}
              alt="Profile avatar"
              className="h-28 w-28 rounded-full border-2 border-[#ffd76a]/40 object-cover"
            />
            <div>
              <h2 className="loot-title text-3xl font-black">{profile.username}</h2>
              <p className="loot-muted mt-2 text-sm">{profile.email || "No email registered"}</p>
            </div>
          </div>
          <div className="grid gap-4 border-t border-[#fff1be]/10 p-6 lg:grid-cols-2">
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
          <div className="flex flex-wrap gap-3 border-t border-[#fff1be]/10 p-6">
            <button
              type="button"
              onClick={() => void saveAppearance()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save photo and cover"}
            </button>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold"
            >
              Sign out
            </button>
            {feedback ? <p className="self-center text-sm font-semibold text-[#8dd0ff]">{feedback}</p> : null}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#ffc94d]">Loot Coins</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">{profile.lootCoins.toLocaleString("pt-BR")}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Current balance for gold purchases, boosts, and items.</p>
          </article>

          <Link href="/profile/inventory" className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dd0ff]">Inventory</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Items, tickets, and keys</h2>
            <p className="loot-muted mt-4 text-base leading-7">Open to see all account items and active resources.</p>
          </Link>

          <Link href="/profile/history" className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#f7ba2c]">History</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Purchases and sales</h2>
            <p className="loot-muted mt-4 text-base leading-7">Track all marketplace activity.</p>
          </Link>
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
