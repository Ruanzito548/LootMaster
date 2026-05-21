"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { auth } from "../../../lib/firebase";
import { useProfileSession } from "../use-profile-session";

type WithdrawMethod = "pix" | "paypal" | "crypto-usdt";

const destinationLabels: Record<WithdrawMethod, string> = {
  pix: "PIX key",
  paypal: "PayPal email",
  "crypto-usdt": "USDT wallet address",
};

const destinationPlaceholders: Record<WithdrawMethod, string> = {
  pix: "CPF, phone, email, or random key",
  paypal: "name@example.com",
  "crypto-usdt": "TRC20/ERC20 wallet address",
};

export default function ProfileWithdrawPage() {
  const { status, profile, reload } = useProfileSession();
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<WithdrawMethod | "">("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const amount = useMemo(() => Number(amountInput), [amountInput]);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const canPickMethod = hasValidAmount;
  const canFillDestination = canPickMethod && method !== "";
  const canSubmit = canFillDestination && destination.trim() !== "" && !submitting;

  const submitWithdraw = async () => {
    if (!auth?.currentUser || !method) {
      setFeedback("You must be logged in and select a payment method.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

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
          payoutMethod: method,
          payoutReference: destination.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setFeedback(data.error ?? "Could not create withdrawal request.");
        return;
      }

      setFeedback("Withdrawal request submitted. It is now pending admin review.");
      setAmountInput("");
      setMethod("");
      setDestination("");
      reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading withdrawal form...</p>
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-4 text-sm">Sign in to request a withdrawal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold">
                Go to login
              </Link>
              <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
                Back to profile
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#ffcf57]">Withdraw</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Cash out Loot Coins</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Current balance: {profile.lootCoins.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Loot Coins.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              1. Amount (Loot Coins)
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="100"
                className="loot-input px-4 py-3 text-sm font-semibold"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              2. Payment method
              <select
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value as WithdrawMethod | "");
                  setDestination("");
                }}
                disabled={!canPickMethod}
                className="loot-input px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select method</option>
                <option value="pix">PIX</option>
                <option value="paypal">PayPal</option>
                <option value="crypto-usdt">USDT</option>
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a89a7b]">
              3. {method ? destinationLabels[method] : "Payout destination"}
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder={method ? destinationPlaceholders[method] : "Select a method first"}
                disabled={!canFillDestination}
                className="loot-input px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submitWithdraw()}
              disabled={!canSubmit}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Request withdrawal"}
            </button>
            <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
              Back to profile
            </Link>
          </div>

          {feedback ? <p className="mt-4 text-sm font-semibold text-[#8dd0ff]">{feedback}</p> : null}
        </section>
      </main>
    </div>
  );
}
