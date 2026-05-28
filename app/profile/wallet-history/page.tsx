"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { auth } from "../../../lib/firebase";
import { useProfileSession } from "../use-profile-session";

type WalletHistoryItem = {
  id: string;
  kind: "credit" | "withdrawal" | "purchase" | "fee";
  category: "Fee" | "Withdrawal" | "Sale Receipt" | "Purchase";
  direction: "in" | "out" | "info";
  title: string;
  amount: number;
  unit: "loot" | "usd";
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

function formatAmountForCsv(item: WalletHistoryItem): string {
  if (item.unit === "usd") {
    return item.amount.toFixed(2);
  }

  return item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getKindLabel(item: WalletHistoryItem): string {
  if (item.kind === "purchase") return "Purchase";
  if (item.kind === "fee") return "Fee";
  if (item.kind === "withdrawal") return "Withdrawal";
  return "Credit";
}

function formatAmount(item: WalletHistoryItem): string {
  if (item.unit === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount);
  }

  return `${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Loot`;
}

function amountColor(item: WalletHistoryItem): string {
  if (item.direction === "in") return "text-[#7fffb1]";
  if (item.direction === "out") return "text-[#ffcf57]";
  return "text-[#c9d8ea]";
}

function amountPrefix(item: WalletHistoryItem): string {
  if (item.direction === "in") return "+";
  if (item.direction === "out") return "-";
  return "";
}

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n|\r/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export default function ProfileWalletHistoryPage() {
  const { status, profile } = useProfileSession();
  const [items, setItems] = useState<WalletHistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"All" | WalletHistoryItem["category"]>("All");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (activeFilter === "All") {
      return items;
    }

    return items.filter((item) => item.category === activeFilter);
  }, [activeFilter, items]);

  const exportCsv = () => {
    const header = ["Date", "Category", "Title", "Direction", "Amount", "Unit", "Status", "Method", "Reference"];
    const rows = filteredItems.map((item) => [
      formatDate(item.createdAt),
      item.category,
      item.title,
      item.direction,
      formatAmountForCsv(item),
      item.unit.toUpperCase(),
      formatStatus(item.status),
      item.method?.toUpperCase() ?? "",
      item.reference ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(String(value))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `wallet-history-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Wallet Statement</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Simple list with filters and spreadsheet export.
          </p>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
        ) : null}

        <section className="loot-panel mt-8 rounded-[2rem] p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["All", "Fee", "Withdrawal", "Sale Receipt", "Purchase"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    activeFilter === filter
                      ? "border-[#ffcf57]/50 bg-[#ffcf57]/15 text-[#ffe7a3]"
                      : "border-[#ffffff22] text-[#c4d5e9] hover:border-[#84d5ff]/40 hover:text-[#e5f3ff]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredItems.length === 0}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80">
            {filteredItems.length === 0 ? (
              <p className="loot-muted px-5 py-4 text-sm">No records found for this filter.</p>
            ) : (
              <div className="divide-y divide-[#fff1be]/10">
                {filteredItems.map((item, index) => (
                  <article key={item.id} className={`px-4 py-4 ${index % 2 === 0 ? "" : "bg-[#0a1a2b]/55"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em]">
                          <span className="font-semibold text-[#8dd0ff]">{item.category || getKindLabel(item)}</span>
                          <span className="text-[#6f88a5]">•</span>
                          <span className="text-[#b7cce3]">{formatDate(item.createdAt)}</span>
                        </div>

                        <p className="text-sm font-semibold text-[#e5f3ff]">{item.title}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#c4d5e9]">
                          <span>Status: {formatStatus(item.status)}</span>
                          <span>Method: {item.method ? item.method.toUpperCase() : "--"}</span>
                          <span className="break-all">Reference: {item.reference ?? "--"}</span>
                        </div>
                      </div>

                      <p className={`shrink-0 text-sm font-semibold ${amountColor(item)}`}>
                        {amountPrefix(item)}{formatAmount(item)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
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
