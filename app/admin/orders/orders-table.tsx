"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { OrderRow } from "./export-button";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<number>(0);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    | "created"
    | "status"
    | "agent"
    | "nickname"
    | "email"
    | "game"
    | "gold"
    | "server"
    | "value"
    | "payout"
    | "profit"
    | "fee"
    | "payment"
  >("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    date: "",
    status: "All",
    agent: "",
    nickname: "",
    email: "",
    game: "",
    payment: "All",
  });

  const rowsById = useMemo(() => {
    const map = new Map<string, OrderRow>();
    rows.forEach((row) => map.set(row.id, row));
    return map;
  }, [rows]);

  const statusOptions = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).sort()],
    [rows],
  );

  const paymentOptions = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((row) => row.paymentMethod).filter(Boolean))).sort()],
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesDate = filters.date
        ? row.created.toLowerCase().includes(filters.date.trim().toLowerCase())
        : true;
      const matchesStatus = filters.status === "All" ? true : row.status === filters.status;
      const matchesNickname = filters.nickname
        ? row.nickname.toLowerCase().includes(filters.nickname.trim().toLowerCase())
        : true;
      const matchesAgent = filters.agent
        ? `${row.agentName} ${row.agentEmail}`.toLowerCase().includes(filters.agent.trim().toLowerCase())
        : true;
      const matchesEmail = filters.email
        ? row.email.toLowerCase().includes(filters.email.trim().toLowerCase())
        : true;
      const matchesGame = filters.game
        ? `${row.gameTitle} ${row.categoryTitle}`.toLowerCase().includes(filters.game.trim().toLowerCase())
        : true;
      const matchesPayment = filters.payment === "All" ? true : row.paymentMethod === filters.payment;

      return (
        matchesDate &&
        matchesStatus &&
        matchesAgent &&
        matchesNickname &&
        matchesEmail &&
        matchesGame &&
        matchesPayment
      );
    });
  }, [filters, rows]);

  const sortedRows = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((left, right) => {
      let compare = 0;

      if (sortBy === "created") {
        compare = new Date(left.created).getTime() - new Date(right.created).getTime();
      } else if (sortBy === "status") {
        compare = left.status.localeCompare(right.status, "en-US", { sensitivity: "base" });
      } else if (sortBy === "nickname") {
        compare = left.nickname.localeCompare(right.nickname, "en-US", { sensitivity: "base" });
      } else if (sortBy === "agent") {
        compare = `${left.agentName} ${left.agentEmail}`.localeCompare(
          `${right.agentName} ${right.agentEmail}`,
          "en-US",
          { sensitivity: "base" },
        );
      } else if (sortBy === "email") {
        compare = left.email.localeCompare(right.email, "en-US", { sensitivity: "base" });
      } else if (sortBy === "game") {
        compare = `${left.gameTitle} ${left.categoryTitle}`.localeCompare(
          `${right.gameTitle} ${right.categoryTitle}`,
          "en-US",
          { sensitivity: "base" },
        );
      } else if (sortBy === "gold") {
        compare = Number(left.goldAmount.replace(/,/g, "")) - Number(right.goldAmount.replace(/,/g, ""));
      } else if (sortBy === "server") {
        compare = `${left.server} ${left.faction}`.localeCompare(`${right.server} ${right.faction}`, "en-US", {
          sensitivity: "base",
        });
      } else if (sortBy === "value") {
        compare = left.totalCents - right.totalCents;
      } else if (sortBy === "payout") {
        compare = left.sellerAmountCents - right.sellerAmountCents;
      } else if (sortBy === "profit") {
        compare = left.platformProfitCents - right.platformProfitCents;
      } else if (sortBy === "fee") {
        compare = left.commissionPercent - right.commissionPercent;
      } else if (sortBy === "payment") {
        compare = left.paymentMethod.localeCompare(right.paymentMethod, "en-US", { sensitivity: "base" });
      }

      return compare * directionMultiplier;
    });
  }, [filteredRows, sortBy, sortDirection]);

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortDirection(column === "created" ? "desc" : "asc");
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportVisibleRows() {
    const headers = [
      "ID",
      "Date",
      "Status",
      "Agent",
      "Nickname",
      "Email",
      "Game",
      "Category",
      "Gold",
      "Server",
      "Faction",
      "Value",
      "Payout",
      "Profit",
      "Fee",
      "Delivery",
      "Payment",
    ];

    const csvRows = sortedRows.map((row) =>
      [
        row.id,
        row.created,
        row.status,
        row.agentName,
        row.nickname,
        row.email,
        row.gameTitle,
        row.categoryTitle,
        row.goldAmount,
        row.server,
        row.faction,
        formatMoney(row.totalCents),
        formatMoney(row.sellerAmountCents),
        formatMoney(row.platformProfitCents),
        `${row.commissionPercent}%`,
        row.deliveryMethod,
        row.paymentMethod,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveFee(orderId: string) {
    const row = rowsById.get(orderId);
    if (!row) {
      return;
    }

    const percent = Number(editingFee);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setErrorMessage("Fee must be between 0 and 100.");
      return;
    }

    setSavingOrderId(orderId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/orders/update-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          commissionPercent: percent,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Could not update fee.");
        return;
      }

      setEditingOrderId(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update fee.");
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-green-900 bg-black">
      {errorMessage ? (
        <p className="border-b border-red-900 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-green-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-green-500">
          <span>{sortedRows.length} visible</span>
          <span>•</span>
          <span>{rows.length} total</span>
        </div>
        <button
          type="button"
          onClick={exportVisibleRows}
          className="rounded-md border border-green-700 bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-green-400 transition hover:bg-green-950"
        >
          Export visible rows
        </button>
      </div>

      <table className="w-full table-fixed text-left text-xs">
        <thead>
          <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("created")} className="inline-flex items-center gap-1">Date <span>{sortBy === "created" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1">Status <span>{sortBy === "status" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("agent")} className="inline-flex items-center gap-1">Agent <span>{sortBy === "agent" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("nickname")} className="inline-flex items-center gap-1">Nickname <span>{sortBy === "nickname" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("email")} className="inline-flex items-center gap-1">Email <span>{sortBy === "email" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("game")} className="inline-flex items-center gap-1">Game <span>{sortBy === "game" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("gold")} className="inline-flex items-center gap-1">Gold <span>{sortBy === "gold" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("server")} className="inline-flex items-center gap-1">Server <span>{sortBy === "server" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("value")} className="inline-flex items-center gap-1">Value <span>{sortBy === "value" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("payout")} className="inline-flex items-center gap-1">Payout <span>{sortBy === "payout" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("profit")} className="inline-flex items-center gap-1">Profit <span>{sortBy === "profit" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("fee")} className="inline-flex items-center gap-1">Fee <span>{sortBy === "fee" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2"><button type="button" onClick={() => toggleSort("payment")} className="inline-flex items-center gap-1">Payment <span>{sortBy === "payment" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
            <th className="px-2 py-2">Applicants</th>
          </tr>
          <tr className="border-b border-green-950 bg-green-950/10 text-[11px] text-green-400">
            <th className="px-2 py-2">
              <input value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} placeholder="Filter" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300">
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </th>
            <th className="px-2 py-2">
              <input value={filters.agent} onChange={(event) => updateFilter("agent", event.target.value)} placeholder="Filter" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.nickname} onChange={(event) => updateFilter("nickname", event.target.value)} placeholder="Filter" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.email} onChange={(event) => updateFilter("email", event.target.value)} placeholder="Filter" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2">
              <input value={filters.game} onChange={(event) => updateFilter("game", event.target.value)} placeholder="Filter" className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300" />
            </th>
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2">
              <select value={filters.payment} onChange={(event) => updateFilter("payment", event.target.value)} className="w-full rounded border border-green-900 bg-black px-2 py-1 text-[11px] text-green-300">
                {paymentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => {
            const isEditing = editingOrderId === row.id;
            const isSaving = savingOrderId === row.id;

            return (
              <tr
                key={row.id}
                className={`border-b border-green-950 transition-colors hover:bg-green-950/40 ${
                  i % 2 === 0 ? "" : "bg-green-950/20"
                }`}
              >
                <td className="break-words px-2 py-2 text-[11px] text-green-600">{row.created}</td>
                <td className="px-2 py-2">
                  <span
                    className={`text-xs font-semibold ${
                      row.status === "Completed"
                        ? "text-blue-400"
                        : row.status === "Paid"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="break-words px-2 py-2 text-[11px] text-cyan-300">
                  <p>{row.agentName}</p>
                  {row.agentEmail !== "--" ? <p className="text-cyan-500">{row.agentEmail}</p> : null}
                </td>
                <td className="break-words px-2 py-2 font-medium text-green-300">{row.nickname}</td>
                <td className="break-all px-2 py-2 text-[11px] text-green-500">{row.email}</td>
                <td className="break-words px-2 py-2 text-green-400">
                  {row.gameTitle}
                  {row.categoryTitle !== "--" ? <span className="ml-1 text-xs text-green-600">/ {row.categoryTitle}</span> : null}
                </td>
                <td className="px-2 py-2 text-green-400">{row.goldAmount}</td>
                <td className="break-words px-2 py-2 text-[11px] text-green-500">
                  {row.server !== "--" ? row.server : ""}
                  {row.faction !== "--" ? ` / ${row.faction}` : ""}
                  {row.server === "--" && row.faction === "--" ? "--" : ""}
                </td>
                <td className="px-2 py-2 font-semibold text-green-300">{formatMoney(row.totalCents)}</td>
                <td className="px-2 py-2 text-amber-300">{formatMoney(row.sellerAmountCents)}</td>
                <td className="px-2 py-2 text-cyan-300">{formatMoney(row.platformProfitCents)}</td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={editingFee}
                        onChange={(event) => setEditingFee(Number(event.target.value))}
                        className="w-16 rounded border border-green-800 bg-black px-1 py-1 text-xs text-green-300"
                      />
                      <span className="text-xs text-green-500">%</span>
                      <button
                        type="button"
                        onClick={() => void saveFee(row.id)}
                        disabled={isSaving}
                        className="rounded border border-amber-700 bg-amber-950/30 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-950/50 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold text-green-300">{row.commissionPercent}%</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrderId(row.id);
                          setEditingFee(row.commissionPercent);
                        }}
                        className="rounded border border-green-800 px-2 py-1 text-xs font-semibold text-green-300 hover:bg-green-950"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 text-xs font-medium uppercase text-green-400">{row.paymentMethod}</td>
                <td className="px-2 py-2">
                  <Link
                    href={`/admin/orders/${row.id}`}
                    className="inline-flex rounded-md border border-green-800 px-2 py-1 text-[11px] font-semibold text-green-300 transition hover:bg-green-950"
                  >
                    View applicants
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
