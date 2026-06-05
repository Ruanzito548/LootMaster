"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

type GrantResponse = {
  ok?: boolean;
  error?: string;
  chestTitle?: string;
  quantity?: number;
};

export function GrantRandomChestButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onGrant = async () => {
    if (submitting) {
      return;
    }

    if (!auth?.currentUser) {
      setErrorMessage("Sign in with an admin account first.");
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/rewards/grant-random-chest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = (await response.json()) as GrantResponse;

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Could not grant random chest.");
        return;
      }

      const title = data.chestTitle ?? "Chest";
      const quantity = typeof data.quantity === "number" ? data.quantity : null;
      setMessage(quantity === null ? `Added ${title} to your inventory.` : `Added ${title}. You now have ${quantity}.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not grant random chest.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-[1.2rem] border border-green-900 bg-green-950/20 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Rewards Admin</p>
      <p className="mt-2 text-sm text-green-400">Add 1 random chest directly to your inventory.</p>

      <button
        type="button"
        onClick={() => void onGrant()}
        disabled={submitting}
        className="mt-4 inline-flex rounded-md border border-green-700 bg-green-950 px-4 py-2 text-sm font-semibold text-green-200 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add random chest"}
      </button>

      {message ? <p className="mt-3 text-sm font-semibold text-emerald-300">{message}</p> : null}
      {errorMessage ? <p className="mt-3 text-sm font-semibold text-red-400">{errorMessage}</p> : null}
    </div>
  );
}
