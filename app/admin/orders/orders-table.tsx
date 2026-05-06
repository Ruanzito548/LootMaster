"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { OrderRow } from "./export-button";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<number>(0);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rowsById = useMemo(() => {
    const map = new Map<string, OrderRow>();
    rows.forEach((row) => map.set(row.id, row));
    return map;
  }, [rows]);

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
    <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
      {errorMessage ? (
        <p className="border-b border-red-900 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Nickname</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Game</th>
            <th className="px-4 py-3">Gold</th>
            <th className="px-4 py-3">Server</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Payout</th>
            <th className="px-4 py-3">Profit</th>
            <th className="px-4 py-3">Fee</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Applicants</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isEditing = editingOrderId === row.id;
            const isSaving = savingOrderId === row.id;

            return (
              <tr
                key={row.id}
                className={`border-b border-green-950 transition-colors hover:bg-green-950/40 ${
                  i % 2 === 0 ? "" : "bg-green-950/20"
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-green-600">{row.created}</td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 font-medium text-green-300">{row.nickname}</td>
                <td className="px-4 py-3 text-xs text-green-500">{row.email}</td>
                <td className="px-4 py-3 text-green-400">
                  {row.gameTitle}
                  {row.categoryTitle !== "--" ? <span className="ml-1 text-xs text-green-600">/ {row.categoryTitle}</span> : null}
                </td>
                <td className="px-4 py-3 text-green-400">{row.goldAmount}</td>
                <td className="px-4 py-3 text-xs text-green-500">
                  {row.server !== "--" ? row.server : ""}
                  {row.faction !== "--" ? ` / ${row.faction}` : ""}
                  {row.server === "--" && row.faction === "--" ? "--" : ""}
                </td>
                <td className="px-4 py-3 font-semibold text-green-300">{formatMoney(row.totalCents, row.currency)}</td>
                <td className="px-4 py-3 text-amber-300">{formatMoney(row.sellerAmountCents, row.currency)}</td>
                <td className="px-4 py-3 text-cyan-300">{formatMoney(row.platformProfitCents, row.currency)}</td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={editingFee}
                        onChange={(event) => setEditingFee(Number(event.target.value))}
                        className="w-20 rounded border border-green-800 bg-black px-2 py-1 text-xs text-green-300"
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
                    <div className="flex items-center gap-2">
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
                <td className="px-4 py-3 text-xs font-medium uppercase text-green-400">{row.paymentMethod}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${row.id}`}
                    className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950"
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
