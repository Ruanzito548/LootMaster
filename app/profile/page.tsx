"use client";

import Link from "next/link";
import { useState } from "react";

import { auth } from "../../lib/firebase";
import { defaultCoverURL, defaultPhotoURL } from "../../lib/profile-data";
import { useProfileSession } from "./use-profile-session";

export default function ProfilePage() {
  const { status, profile, error, saveProfile, signOutUser, reload } = useProfileSession();
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [coverDraft, setCoverDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("pix");
  const [withdrawReference, setWithdrawReference] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawFeedback, setWithdrawFeedback] = useState<string | null>(null);

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

  const submitWithdraw = async () => {
    if (!auth?.currentUser) {
      setWithdrawFeedback("You must be logged in to request a withdrawal.");
      return;
    }

    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawFeedback("Enter a valid Loot Coins amount.");
      return;
    }

    if (!withdrawReference.trim()) {
      setWithdrawFeedback("Add your payout destination before submitting.");
      return;
    }

    setWithdrawing(true);
    setWithdrawFeedback(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/profile/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount,
          payoutMethod: withdrawMethod,
          payoutReference: withdrawReference.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setWithdrawFeedback(data.error ?? "Could not create withdrawal request.");
        return;
      }

      setWithdrawFeedback("Withdrawal request submitted. It is now pending admin review.");
      setWithdrawAmount("");
      setWithdrawReference("");
      reload();
    } catch (error) {
      setWithdrawFeedback(error instanceof Error ? error.message : "Could not create withdrawal request.");
    } finally {
      setWithdrawing(false);
    }
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
          <div className="space-y-4">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#ffcf57]">Withdraw</p>
            <h2 className="loot-title text-3xl font-black">Cash out Loot Coins</h2>
            <p className="loot-muted text-sm leading-7">
              Request a withdrawal from your Loot Coins balance. Your request is submitted for admin review.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              Amount (Loot Coins)
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="100"
                className="loot-input px-4 py-3 text-sm font-semibold"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              Method
              <select
                value={withdrawMethod}
                onChange={(event) => setWithdrawMethod(event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
              >
                <option value="pix">PIX</option>
                <option value="paypal">PayPal</option>
                <option value="crypto-usdt">USDT</option>
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              Payout destination
              <input
                value={withdrawReference}
                onChange={(event) => setWithdrawReference(event.target.value)}
                placeholder="PIX key, email, wallet address"
                className="loot-input px-4 py-3 text-sm font-semibold"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submitWithdraw()}
              disabled={withdrawing}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {withdrawing ? "Submitting..." : "Request withdrawal"}
            </button>
            {withdrawFeedback ? <p className="text-sm font-semibold text-[#8dd0ff]">{withdrawFeedback}</p> : null}
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
