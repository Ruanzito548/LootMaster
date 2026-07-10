import Link from "next/link";

import WithdrawalsClient from "../withdrawals-client";
import { type WithdrawalRow, loadWithdrawalRows } from "../withdrawals-data";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsRejectedPage() {
  let loadError: string | null = null;
  let rows: WithdrawalRow[] = [];

  try {
    const allRows = await loadWithdrawalRows();
    rows = allRows.filter((row) => row.status === "rejected");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load withdrawal requests.";
  }

  return (
    <div className="text-green-300">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Saques</p>
          <h1 className="mt-1 text-3xl font-semibold text-green-200 sm:text-4xl">Saques Rejeitados</h1>
          <p className="mt-2 text-sm text-green-500">Historico de saques rejeitados e estornados.</p>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
      ) : (
        <div className="mt-6">
          <WithdrawalsClient rows={rows} mode="rejected" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/withdrawals"
          className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
        >
          Voltar para saques
        </Link>
      </div>
    </div>
  );
}
