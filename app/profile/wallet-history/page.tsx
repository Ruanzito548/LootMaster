"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { auth } from "../../../lib/firebase";
import { useProfileSession } from "../use-profile-session";

type WalletHistoryItem = {
  id: string;
  kind: "credit" | "withdrawal";
  title: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  createdAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US");
}

function formatStatus(value: string): string {
  return value.replace(/_/g, " ");
}

export default function ProfileWalletHistoryPage() {
  const { status, profile } = useProfileSession();
  const [items, setItems] = useState<WalletHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !auth?.currentUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/profile/wallet-history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = (await response.json()) as { error?: string; items?: WalletHistoryItem[] };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load wallet history.");
        }

        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load wallet history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading wallet history...</p>
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
            <p className="loot-muted mt-3 text-sm">Log in to view your Loot Coins credits and withdrawal history.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Go to login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#ffcf57]">Wallet History</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Loot Coins credits and withdrawals</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Review credits sent to your account and every withdrawal request you submitted.
          </p>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
        ) : null}

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <p className="loot-muted text-sm">No Loot Coins history found yet.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-[#fff1be]/10 bg-[#06121d]/80 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dd0ff]">
                        {item.kind === "credit" ? "Credit" : "Withdrawal"}
                      </p>
                      <h2 className="loot-title mt-2 text-2xl font-black">{item.title}</h2>
                      <p className="loot-muted mt-2 text-sm">
                        Status: {formatStatus(item.status)} • {formatDate(item.createdAt)}
                      </p>
                      {item.method ? <p className="loot-muted mt-1 text-sm">Method: {item.method.toUpperCase()}</p> : null}
                      {item.reference ? <p className="loot-muted mt-1 text-sm break-all">Reference: {item.reference}</p> : null}
                    </div>
                    <p className={`text-lg font-black ${item.kind === "credit" ? "text-[#7fffb1]" : "text-[#ffcf57]"}`}>
                      {item.kind === "credit" ? "+" : "-"}
                      {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Loot
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/withdraw" className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Request withdrawal
          </Link>
        </div>
      </main>
    </div>
  );
}
