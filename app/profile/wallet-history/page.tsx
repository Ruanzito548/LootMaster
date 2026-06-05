"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [sortBy, setSortBy] = useState<"date" | "category" | "title" | "status" | "method" | "reference" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [columnWidths, setColumnWidths] = useState<number[]>([13, 10, 22, 12, 11, 20, 12]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resizeStateRef = useRef<{ index: number; startX: number; startWidths: number[] } | null>(null);

  const columns = [
    { key: "date", label: "Date", sortable: true },
    { key: "category", label: "Category", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "method", label: "Method", sortable: true },
    { key: "reference", label: "Reference", sortable: true },
    { key: "amount", label: "Amount", sortable: true },
  ] as const;

  const filteredItems = useMemo(() => {
    if (activeFilter === "All") {
      return items;
    }

    return items.filter((item) => item.category === activeFilter);
  }, [activeFilter, items]);

  const sortedItems = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredItems].sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;

      const leftSignedAmount = left.direction === "out" ? -left.amount : left.amount;
      const rightSignedAmount = right.direction === "out" ? -right.amount : right.amount;

      let compare = 0;

      if (sortBy === "date") {
        compare = leftDate - rightDate;
      } else if (sortBy === "category") {
        compare = left.category.localeCompare(right.category, "en-US", { sensitivity: "base" });
      } else if (sortBy === "title") {
        compare = left.title.localeCompare(right.title, "en-US", { sensitivity: "base" });
      } else if (sortBy === "status") {
        compare = formatStatus(left.status).localeCompare(formatStatus(right.status), "en-US", { sensitivity: "base" });
      } else if (sortBy === "method") {
        compare = (left.method ?? "").localeCompare(right.method ?? "", "en-US", { sensitivity: "base" });
      } else if (sortBy === "reference") {
        compare = (left.reference ?? "").localeCompare(right.reference ?? "", "en-US", { sensitivity: "base" });
      } else {
        compare = leftSignedAmount - rightSignedAmount;
      }

      return compare * directionMultiplier;
    });
  }, [filteredItems, sortBy, sortDirection]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const { index, startX, startWidths } = resizeState;
      const deltaX = event.clientX - startX;
      const deltaPercent = (deltaX / window.innerWidth) * 100;
      const leftWidth = startWidths[index] + deltaPercent;
      const rightWidth = startWidths[index + 1] - deltaPercent;
      const minWidth = 6;

      if (leftWidth < minWidth || rightWidth < minWidth) {
        return;
      }

      const next = [...startWidths];
      next[index] = leftWidth;
      next[index + 1] = rightWidth;
      setColumnWidths(next);
    };

    const onMouseUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const beginResize = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      index,
      startX: event.clientX,
      startWidths: [...columnWidths],
    };
  };

  const handleSort = (column: typeof columns[number]["key"]) => {
    if (sortBy === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortDirection(column === "date" ? "desc" : "asc");
  };

  const exportCsv = () => {
    const header = ["Date", "Category", "Title", "Direction", "Amount", "Unit", "Status", "Method", "Reference"];
    const rows = sortedItems.map((item) => [
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-12 sm:px-6 lg:px-8">
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
              disabled={sortedItems.length === 0}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80">
            {filteredItems.length === 0 ? (
              <p className="loot-muted px-5 py-4 text-sm">No records found for this filter.</p>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    {columnWidths.map((width, index) => (
                      <col key={columns[index].key} style={{ width: `${width}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#fff1be]/10 bg-[#0a1a2b]/70 text-xs font-semibold uppercase tracking-[0.12em] text-[#8dd0ff]">
                      {columns.map((column, index) => {
                        const isActiveSort = sortBy === column.key;
                        const isAmount = column.key === "amount";

                        return (
                          <th key={column.key} className={`relative px-4 py-3 ${isAmount ? "text-right" : "text-left"}`}>
                            <button
                              type="button"
                              onClick={() => handleSort(column.key)}
                              className={`inline-flex items-center gap-1 ${isAmount ? "ml-auto" : ""} hover:text-[#d9f1ff]`}
                            >
                              <span>{column.label}</span>
                              <span className="text-[10px] text-[#86accf]">
                                {isActiveSort ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            </button>

                            {index < columns.length - 1 ? (
                              <div
                                role="separator"
                                aria-orientation="vertical"
                                onMouseDown={(event) => beginResize(index, event)}
                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                              >
                                <div className="mx-auto h-full w-px bg-[#84d5ff]/25" />
                              </div>
                            ) : null}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item, index) => (
                      <tr key={item.id} className={`border-b border-[#fff1be]/10 align-top ${index % 2 === 0 ? "" : "bg-[#0a1a2b]/45"}`}>
                        <td className="px-4 py-3 text-[#b7cce3]">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3 font-semibold text-[#8dd0ff]">{item.category || getKindLabel(item)}</td>
                        <td className="break-words px-4 py-3 text-[#e5f3ff]">{item.title}</td>
                        <td className="break-words px-4 py-3 text-[#c4d5e9]">{formatStatus(item.status)}</td>
                        <td className="break-words px-4 py-3 text-[#c4d5e9]">{item.method ? item.method.toUpperCase() : "--"}</td>
                        <td className="break-all px-4 py-3 text-[#c4d5e9]">{item.reference ?? "--"}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${amountColor(item)}`}>
                          {amountPrefix(item)}{formatAmount(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
