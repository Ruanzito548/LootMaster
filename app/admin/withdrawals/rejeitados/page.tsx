import Link from "next/link";

import WithdrawalsClient from "../withdrawals-client";

export const dynamic = "force-dynamic";

export default function AdminWithdrawalsRejectedPage() {

  return (
    <div className="text-green-300">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Saques</p>
          <h1 className="mt-1 text-3xl font-semibold text-green-200 sm:text-4xl">Saques Rejeitados</h1>
          <p className="mt-2 text-sm text-green-500">Historico de saques rejeitados e estornados.</p>
        </div>
      </div>

      <div className="mt-6">
        <WithdrawalsClient mode="rejected" />
      </div>

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
