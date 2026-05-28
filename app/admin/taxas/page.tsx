import Link from "next/link";

import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type FeeTransferRow = {
  id: string;
  orderId: string;
  customerUid: string | null;
  customerEmail: string;
  currency: string;
  amountTotalCents: number;
  commissionPercent: number;
  platformFeeCents: number;
  agentUid: string | null;
  agentFeeSharePercent: number;
  agentPayoutCents: number;
  lootmasterFeeCents: number;
  status: string;
  createdAt: string | null;
};

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as { toDate?: () => Date };
  if (typeof parsed.toDate !== "function") {
    return null;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatMoneyUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

export default async function AdminTaxasPage() {
  let rows: FeeTransferRow[] = [];
  let loadError: string | null = null;

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("fee-transfers")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();

    rows = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;

      return {
        id: docRow.id,
        orderId: typeof data.orderId === "string" ? data.orderId : docRow.id,
        customerUid: typeof data.customerUid === "string" ? data.customerUid : null,
        customerEmail: typeof data.customerEmail === "string" ? data.customerEmail : "",
        currency: typeof data.currency === "string" ? data.currency : "brl",
        amountTotalCents: typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0,
        commissionPercent: typeof data.commissionPercent === "number" ? data.commissionPercent : 15,
        platformFeeCents: typeof data.platformFeeCents === "number" ? data.platformFeeCents : 0,
        agentUid: typeof data.agentUid === "string" ? data.agentUid : null,
        agentFeeSharePercent: typeof data.agentFeeSharePercent === "number" ? data.agentFeeSharePercent : 0,
        agentPayoutCents: typeof data.agentPayoutCents === "number" ? data.agentPayoutCents : 0,
        lootmasterFeeCents: typeof data.lootmasterFeeCents === "number" ? data.lootmasterFeeCents : 0,
        status: typeof data.status === "string" ? data.status : "unknown",
        createdAt: serializeTimestamp(data.createdAt),
      };
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load fee transfers.";
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Taxas</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-green-600">
              Registro de repasses de taxa por compra para agentes e para a LootMaster.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clientes"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Clientes e agentes
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Back to admin
            </Link>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
            {loadError}
          </p>
        ) : null}

        <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
          {rows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-green-600">No fee transfer records found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Taxa total</th>
                  <th className="px-4 py-3">Agente</th>
                  <th className="px-4 py-3">Repasse agente</th>
                  <th className="px-4 py-3">LootMaster</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-green-300">{row.orderId}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      <p>{row.customerUid ?? "--"}</p>
                      <p className="mt-1">{row.customerEmail || "--"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-green-300">{formatMoneyUsd(row.amountTotalCents)}</td>
                    <td className="px-4 py-3 text-xs text-green-300">
                      {formatMoneyUsd(row.platformFeeCents)} ({row.commissionPercent.toFixed(2)}%)
                    </td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      {row.agentUid ? `${row.agentUid} (${row.agentFeeSharePercent.toFixed(2)}%)` : "Sem agente"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-300">
                      {formatMoneyUsd(row.agentPayoutCents)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-green-300">
                      {formatMoneyUsd(row.lootmasterFeeCents)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-amber-300">
                      {row.status.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString("pt-BR") : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
