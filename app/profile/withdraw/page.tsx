"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Coins, CreditCard, Landmark, Lock, ShieldCheck, Wallet2 } from "lucide-react";
import { useMemo, useState } from "react";

import { auth } from "../../../lib/firebase";
import { useProfileSession } from "../use-profile-session";

type WithdrawMethod = "pix" | "paypal" | "crypto-usdt";

type MethodOption = {
  value: WithdrawMethod;
  label: string;
  icon: typeof CreditCard;
};

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

const METHOD_OPTIONS: MethodOption[] = [
  { value: "pix", label: "PIX", icon: Landmark },
  { value: "paypal", label: "PayPal", icon: CreditCard },
  { value: "crypto-usdt", label: "USDT", icon: Wallet2 },
];

const formatLootAmount = (value: number) =>
  `${Number.isFinite(value) ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} LC`;

export default function ProfileWithdrawPage() {
  const { status, profile, reload } = useProfileSession();
  const [amountInput, setAmountInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [method, setMethod] = useState<WithdrawMethod | "">("");
  const [destination, setDestination] = useState("");
  const [confirmHighValue, setConfirmHighValue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const amount = useMemo(() => Number(amountInput), [amountInput]);
  const availableBalance = Number(profile?.lootCoins ?? 0);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const canPickMethod = hasValidAmount;
  const canFillDestination = canPickMethod && method !== "";
  const requiresHighValueConfirmation = Number.isFinite(amount) && amount > 100;
  const canSubmit = fullName.trim() !== "" && fullName.trim().length <= 50 && canFillDestination && destination.trim() !== "" && (!requiresHighValueConfirmation || confirmHighValue) && !submitting;

  const activeStep = !amountInput ? 1 : method === "" ? 2 : 3;

  const quickAmounts = useMemo(
    () => [0.25, 0.5, 0.75, 1].map((ratio) => ({
      label: `${Math.round(ratio * 100)}%`,
      value: Number((availableBalance * ratio).toFixed(2)),
    })),
    [availableBalance],
  );

  const setQuickAmount = (value: number) => {
    const safeValue = Math.max(0, Number(value.toFixed(2)));
    setAmountInput(String(safeValue));
  };

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
          fullName: fullName.trim(),
          payoutMethod: method,
          payoutReference: destination.trim(),
          confirmHighValue,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setFeedback(data.error ?? "Could not create withdrawal request.");
        return;
      }

      setFeedback("Withdrawal request submitted. It is now pending admin review.");
      setAmountInput("");
      setFullName("");
      setMethod("");
      setDestination("");
      setConfirmHighValue(false);
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
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
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
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#d4af5a]/20 bg-[#070d16]/90 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.5)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,90,0.12),transparent_32%),radial-gradient(circle_at_left_bottom,_rgba(56,95,135,0.15),transparent_35%)]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af5a]/30 bg-[#0d1821] px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#f4d17a]">
                <Wallet2 className="h-3.5 w-3.5" />
                Withdraw
              </div>

              <h1 className="mt-4 text-4xl font-black leading-none text-[#f3f6fb] sm:text-5xl">Cash out Loot Coins</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#aabed6]">
                Withdraw your Loot Coins securely using your preferred method.
              </p>

              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[#d4af5a]/28 bg-[#0d1821]/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(212,175,90,0.12)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af5a]/45 bg-[#161d2a] text-[#f7d98c]">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-[#9ec1dd]">Current balance</p>
                  <p className="mt-1 text-2xl font-black text-[#f6d67b]">{formatLootAmount(availableBalance)}</p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none relative hidden h-52 w-72 overflow-hidden opacity-80 lg:block">
              <div className="absolute inset-0 rounded-[2rem] border border-[#d4af5a]/20 bg-[radial-gradient(circle_at_50%_20%,rgba(255,209,110,0.16),transparent_30%),linear-gradient(160deg,rgba(11,18,28,0.8),rgba(8,12,20,0.95))]" />
              <Image
                src="/baus/epico.png"
                alt="Epic chest"
                width={280}
                height={220}
                className="absolute left-1/2 top-1/2 h-[180px] w-auto -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_28px_rgba(241,197,90,0.24)]"
              />
              <div className="absolute inset-x-10 bottom-4 h-10 rounded-full bg-[#f4c463]/10 blur-2xl" />
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((stepNumber) => {
              const isActive = stepNumber === activeStep;
              const isComplete = stepNumber < activeStep;
              const labels = ["AMOUNT", "METHOD", "DESTINATION"];
              const sublabels = ["Enter amount", "Select payment method", "Payout details"];

              return (
                <div
                  key={stepNumber}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    isActive
                      ? "border-[#d4af5a]/40 bg-[#121b28]/90"
                      : isComplete
                        ? "border-emerald-400/30 bg-emerald-500/5"
                        : "border-white/10 bg-[#0d1821]/60"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                      isActive
                        ? "border-[#d4af5a] bg-[#d4af5a] text-[#111827]"
                        : isComplete
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                          : "border-white/15 bg-black/20 text-[#aabed6]"
                    }`}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-[#aabed6]">
                      {labels[stepNumber - 1]}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#edf4fc]">{sublabels[stepNumber - 1]}</p>
                  </div>
                  {stepNumber < 3 ? <ChevronRight className="hidden h-4 w-4 text-[#7d93ac] sm:block" /> : null}
                </div>
              );
            })}
          </div>

          <div className="relative mt-8 rounded-[1.75rem] border border-[#d4af5a]/20 bg-[#09131d]/85 p-5 shadow-[inset_0_1px_0_rgba(212,175,90,0.08)] sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af5a]/35 bg-[#171d2a] text-[#f6d67b]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#caa75d]">Nome completo</p>
                      <p className="mt-2 text-sm text-[#9bb0ca]">Informe seu nome completo para o pagamento.</p>
                    </div>
                  </div>

                  <div className="w-full">
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value.slice(0, 50))}
                      maxLength={50}
                      placeholder="Nome e sobrenome"
                      autoComplete="name"
                      className="w-full rounded-xl border border-[#d4af5a]/35 bg-[#0b1320] px-4 py-3 text-sm font-semibold text-[#edf4fc] outline-none transition focus:border-[#f2c879] focus:ring-2 focus:ring-[#f2c879]/15"
                    />
                    <p className="mt-2 text-right text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8aa6c8]">{fullName.length}/50 caracteres</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af5a]/35 bg-[#171d2a] text-[#f6d67b]">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#caa75d]">1. Amount (Loot Coins)</p>
                      <p className="mt-2 text-sm text-[#9bb0ca]">Enter the amount of Loot Coins you want to withdraw.</p>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-[#d4af5a]/30 bg-[#171d2a] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#f0ca75]">
                        LC
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountInput}
                        onChange={(event) => {
                          setAmountInput(event.target.value);
                          setConfirmHighValue(false);
                        }}
                        placeholder="100"
                        className="w-full rounded-xl border border-[#d4af5a]/35 bg-[#0b1320] px-12 py-3 text-right text-2xl font-black text-[#f2f7ff] outline-none transition focus:border-[#f2c879] focus:ring-2 focus:ring-[#f2c879]/15"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#a7bfd8]">
                      <span>Available: {formatLootAmount(availableBalance)}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {quickAmounts.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setQuickAmount(option.value)}
                          className="rounded-xl border border-white/10 bg-[#0e1823] px-2 py-2 text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#d7e8f8] transition hover:border-[#d4af5a]/40 hover:text-[#f9d886]"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af5a]/35 bg-[#171d2a] text-[#f6d67b]">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#caa75d]">2. Payment Method</p>
                      <p className="mt-2 text-sm text-[#9bb0ca]">Choose how you want to receive your Loot Coins.</p>
                    </div>
                  </div>

                  <select
                    value={method}
                    onChange={(event) => {
                      setMethod(event.target.value as WithdrawMethod | "");
                      setDestination("");
                    }}
                    disabled={!canPickMethod}
                    className="w-full rounded-xl border border-[#d4af5a]/35 bg-[#0b1320] px-4 py-3 text-sm font-semibold text-[#edf4fc] outline-none transition focus:border-[#f2c879] focus:ring-2 focus:ring-[#f2c879]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select method</option>
                    {METHOD_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af5a]/35 bg-[#171d2a] text-[#f6d67b]">
                      <Wallet2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#caa75d]">3. Payout Destination</p>
                      <p className="mt-2 text-sm text-[#9bb0ca]">Provide the details where you want to receive your payout.</p>
                    </div>
                  </div>

                  <div className="w-full">
                    <input
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder={method ? destinationPlaceholders[method] : "Select a method first"}
                      disabled={!canFillDestination}
                      className="w-full rounded-xl border border-[#d4af5a]/35 bg-[#0b1320] px-4 py-3 text-sm font-semibold text-[#edf4fc] outline-none transition focus:border-[#f2c879] focus:ring-2 focus:ring-[#f2c879]/15 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8aa6c8]">
                      {method ? destinationLabels[method] : "Fields will appear after selecting a payment method."}
                    </p>
                  </div>
                </div>

                {requiresHighValueConfirmation ? (
                  <label className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-[#f5dfaa]">
                    <input
                      type="checkbox"
                      checked={confirmHighValue}
                      onChange={(event) => setConfirmHighValue(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#d4af5a]"
                    />
                    <span>I confirm that I want to withdraw more than 100 Loot Coins and that the payout destination is correct.</span>
                  </label>
                ) : null}
              </div>

              <aside className="rounded-[1.5rem] border border-[#d4af5a]/20 bg-[#0d1821]/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af5a]/35 bg-[#171d2a] text-[#f6d67b]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f3d57b]">Important</p>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[#b3cadf]">
                  <p>Minimum withdrawal amount may vary depending on the selected method.</p>
                  <p>Fees may apply.</p>
                </div>
              </aside>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 order-2 sm:order-1">
                <button
                  type="button"
                  onClick={() => void submitWithdraw()}
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af5a]/60 bg-[#d4af5a] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#101823] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Coins className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Request withdrawal"}
                </button>

                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0b1320] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#e6edf5] transition hover:border-[#d4af5a]/35 hover:text-[#f4d17a]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to profile
                </Link>
              </div>

              <div className="order-1 flex items-center gap-3 rounded-2xl border border-[#9ac7ff]/20 bg-[#0d1723]/80 px-4 py-3 text-[#dfefff] sm:order-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9ac7ff]/25 bg-[#111d2b] text-[#9ec8ff]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#9ec8ff]">Your security is our priority</p>
                  <p className="mt-1 text-xs text-[#b3c9df]">All withdrawals are reviewed to ensure a safe and secure process.</p>
                </div>
              </div>
            </div>

            {feedback ? <p className="mt-5 rounded-xl border border-[#d4af5a]/15 bg-[#0d1721] px-4 py-3 text-sm font-semibold text-[#9ad7ff]">{feedback}</p> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
