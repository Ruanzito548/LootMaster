import Link from "next/link";

import CreateTestOrderButton from "../create-test-order-button";
import OrdersTable from "../orders-table";
import { loadOrdersRows } from "../orders-data";

export const dynamic = "force-dynamic";

export default async function AdminOrdersOpenPage() {
  const { rows, loadError } = await loadOrdersRows();
  const openRows = rows.filter((row) => row.status !== "Completed");

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Extrato</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Ordens Abertas</h1>
            <p className="mt-2 text-sm text-green-600">Ordens pendentes ou pagas aguardando conclusao.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CreateTestOrderButton />
          </div>
        </div>

        {loadError ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
          </section>
        ) : openRows.length === 0 ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm text-green-600">Nenhuma ordem aberta.</p>
          </section>
        ) : (
          <OrdersTable rows={openRows} />
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>
      </main>
    </div>
  );
}
