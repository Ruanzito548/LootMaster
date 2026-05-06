"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateTestOrderButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders/create-test-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={loading}
        className="rounded-md border border-blue-700 bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-400 transition hover:bg-blue-950/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating test order..." : "Create test order"}
      </button>
      {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
    </div>
  );
}
