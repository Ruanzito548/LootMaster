import Link from "next/link";

import { getAdminDb } from "@/lib/firebase-admin";

import WithdrawalsClient from "./withdrawals-client";

export const dynamic = "force-dynamic";

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

function formatTimestamp(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "--";
  }

  const parsed = value as { toDate?: () => Date };
  if (typeof parsed.toDate !== "function") {
    return "--";
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US");
}

export default async function AdminWithdrawalsPage() {
  let rows: WithdrawalRow[] = [];
  let loadError: string | null = null;

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("withdraw-requests")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    rows = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      return {
        requestId: docRow.id,
        uid: typeof data.uid === "string" ? data.uid : "",
        email: typeof data.email === "string" ? data.email : "",
        amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
        payoutMethod: typeof data.payoutMethod === "string" ? data.payoutMethod : "--",
        payoutReference: typeof data.payoutReference === "string" ? data.payoutReference : "--",
        status: typeof data.status === "string" ? data.status : "pending_review",
        createdAtLabel: formatTimestamp(data.createdAt),
        reviewedAtLabel: formatTimestamp(data.reviewedAt),
      };
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load withdrawal requests.";
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Withdrawals</h1>
            <p className="mt-2 text-sm text-green-600">Approve or reject supplier cashout requests.</p>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
        ) : (
          <div className="mt-6">
            <WithdrawalsClient rows={rows} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Back to admin
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Open orders
          </Link>
        </div>
      </main>
    </div>
  );
}
