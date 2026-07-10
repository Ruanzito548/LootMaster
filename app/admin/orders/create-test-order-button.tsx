"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateTestOrderButton() {
  const router = useRouter();
  const [loadingCurrency, setLoadingCurrency] = useState<"usd" | "eur" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(currency: "usd" | "eur") {
    setLoadingCurrency(currency);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders/create-test-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not create test order.");
        return;
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create test order.");
    } finally {
      setLoadingCurrency(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleCreate("usd")}
          disabled={loadingCurrency !== null}
          className="rounded-md border border-blue-700 bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-400 transition hover:bg-blue-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingCurrency === "usd" ? "Creating USD..." : "Create test USD"}
        </button>
        <button
          type="button"
          onClick={() => void handleCreate("eur")}
          disabled={loadingCurrency !== null}
          className="rounded-md border border-emerald-700 bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-400 transition hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingCurrency === "eur" ? "Creating EUR..." : "Create test EUR"}
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
    </div>
  );
}
