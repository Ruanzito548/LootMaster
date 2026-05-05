"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFriendlyAuthError } from "../../../lib/auth-errors";
import { auth, db, firebaseEnabled } from "../../../lib/firebase";
import { ensureUserProfileDoc } from "../../../lib/profile-data";

function formatAmount(finalAmountCents: string, currency: string) {
  return (Number(finalAmountCents) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (currency || "BRL").toUpperCase(),
  });
}

function SupplierOrderApplyContent() {
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const order = useMemo(
    () => ({
      orderId: searchParams.get("orderId")?.trim() ?? "",
      gameTitle: searchParams.get("gameTitle")?.trim() ?? "Unknown Game",
      categoryTitle: searchParams.get("categoryTitle")?.trim() ?? "Unknown Category",
      goldAmount: searchParams.get("goldAmount")?.trim() ?? "0",
      server: searchParams.get("server")?.trim() ?? "-",
      faction: searchParams.get("faction")?.trim() ?? "-",
      nickname: searchParams.get("nickname")?.trim() ?? "-",
      finalAmountCents: searchParams.get("finalAmountCents")?.trim() ?? "0",
      currency: searchParams.get("currency")?.trim() ?? "brl",
    }),
    [searchParams],
  );

  const submitApplication = async () => {
    if (!firebaseEnabled || !auth || !db) {
      setErrorMessage("Firebase is not configured. Please try again later.");
      return;
    }

    if (!order.orderId) {
      setErrorMessage("This application link is missing an order ID.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      const credentials = auth.currentUser
        ? { user: auth.currentUser }
        : await signInWithPopup(auth, provider);

      await credentials.user.getIdToken();
      await ensureUserProfileDoc(credentials.user, {
        username: credentials.user.displayName?.trim() || "Supplier",
        email: credentials.user.email?.trim().toLowerCase() || "",
      });

      const applicationId = `${order.orderId}_${credentials.user.uid}`;

      await setDoc(doc(db, "order-applications", applicationId), {
        applicationId,
        orderId: order.orderId,
        uid: credentials.user.uid,
        supplierName: credentials.user.displayName?.trim() || "Supplier",
        supplierEmail: credentials.user.email?.trim().toLowerCase() || "",
        supplierDiscordHandle: "",
        supplierDiscordUserId: "",
        gameTitle: order.gameTitle,
        categoryTitle: order.categoryTitle,
        goldAmount: Number(order.goldAmount) || 0,
        server: order.server,
        faction: order.faction,
        nickname: order.nickname,
        finalAmountCents: Number(order.finalAmountCents) || 0,
        currency: order.currency,
        status: "applied",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setSuccessMessage("Your application was submitted successfully. The team can now review your request for this order.");
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(getFriendlyAuthError(error.code, `Could not submit your application (${error.code}).`));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Could not submit your application.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Supplier Portal</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Apply for This Order
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Review the paid order details below and continue with Google to apply as the supplier for this delivery.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Order ID</p>
              <p className="loot-title mt-2 text-lg font-black break-all">{order.orderId || "Missing"}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Amount Paid</p>
              <p className="loot-title mt-2 text-lg font-black">{formatAmount(order.finalAmountCents, order.currency)}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Game</p>
              <p className="loot-muted mt-2 text-base font-semibold">{order.gameTitle}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Category</p>
              <p className="loot-muted mt-2 text-base font-semibold">{order.categoryTitle}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Gold Amount</p>
              <p className="loot-muted mt-2 text-base font-semibold">{Number(order.goldAmount || 0).toLocaleString("en-US")} gold</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Character</p>
              <p className="loot-muted mt-2 text-base font-semibold">{order.nickname}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Server</p>
              <p className="loot-muted mt-2 text-base font-semibold">{order.server}</p>
            </div>
            <div>
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">Faction</p>
              <p className="loot-muted mt-2 text-base font-semibold">{order.faction}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid flex-1 gap-4">
              <p className="loot-muted text-sm leading-7">
                By applying, you are registering your interest in fulfilling this paid order.
                The admin team will review your application in the Orders panel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void submitApplication()}
              disabled={saving || !order.orderId}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Submitting Application..." : "Continue with Google and Apply"}
            </button>
          </div>

          {successMessage ? <p className="mt-4 text-sm font-semibold text-emerald-500">{successMessage}</p> : null}
          {errorMessage ? <p className="mt-4 text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to Home
          </Link>
          <Link href="/login" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Open Login
          </Link>
        </div>
      </main>
    </div>
  );
}

function SupplierOrderApplyFallback() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <section className="loot-panel rounded-[1.75rem] p-8">
          <p className="loot-muted text-sm">Loading application form...</p>
        </section>
      </main>
    </div>
  );
}

export default function SupplierOrderApplyPage() {
  return (
    <Suspense fallback={<SupplierOrderApplyFallback />}>
      <SupplierOrderApplyContent />
    </Suspense>
  );
}