"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type WithdrawalRow = {
  requestId: string;
  uid: string;
  email: string;
  amount: number;
  payoutMethod: string;
  payoutReference: string;
  status: string;
  createdAtLabel: string;
  reviewedAtLabel: string;
};

type Props = {
  rows: WithdrawalRow[];
};

export default function WithdrawalsClient({ rows }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  const review = async (requestId: string, action: "approve" | "reject") => {
    if (!auth?.currentUser || busyId) {
      return;
    }

    setBusyId(requestId);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/withdrawals/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId,
          action,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Could not review withdrawal request.");
        return;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not review withdrawal request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5">
      {!isAuthenticated ? (
        <p className="rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
          Sign in with an admin account to review withdrawal requests.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">No withdrawal requests found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isPending = row.status === "pending_review";
                const busy = busyId === row.requestId;

                return (
                  <tr key={row.requestId} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3 text-xs text-green-500">{row.requestId}</td>
                    <td className="px-4 py-3 text-xs text-green-400">
                      <p>{row.email || "No email"}</p>
                      <p className="text-green-700">{row.uid}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-300">{row.amount.toFixed(2)} Loot</td>
                    <td className="px-4 py-3 uppercase text-green-500">{row.payoutMethod}</td>
                    <td className="px-4 py-3 text-xs text-green-500">{row.payoutReference}</td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-green-400">{row.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      <p>{row.createdAtLabel}</p>
                      {row.reviewedAtLabel !== "--" ? <p className="text-green-700">Reviewed: {row.reviewedAtLabel}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void review(row.requestId, "approve")}
                          disabled={!isAuthenticated || !isPending || busy}
                          className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? "Working..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void review(row.requestId, "reject")}
                          disabled={!isAuthenticated || !isPending || busy}
                          className="inline-flex rounded-md border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? "Working..." : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
