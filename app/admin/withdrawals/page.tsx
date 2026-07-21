import Link from "next/link";

import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let loadError: string | null = null;

  try {
    const adminDb = getAdminDb();

    const [pendingAgg, approvedAgg, rejectedAgg] = await Promise.all([
      adminDb.collection("withdraw-requests").where("status", "==", "pending_review").count().get(),
      adminDb.collection("withdraw-requests").where("status", "==", "approved").count().get(),
      adminDb.collection("withdraw-requests").where("status", "==", "rejected").count().get(),
    ]);

    pendingCount = pendingAgg.data().count;
    approvedCount = approvedAgg.data().count;
    rejectedCount = rejectedAgg.data().count;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load withdrawal requests.";
  }

  return (
    <div className="text-green-300">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
        <h1 className="text-3xl font-semibold text-green-200 sm:text-4xl">Saques</h1>
        <p className="text-sm text-green-500">Selecione a pagina que deseja gerenciar.</p>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href="/admin/withdrawals/aprovar" className="rounded-xl border border-green-800/60 bg-black/40 p-4 transition hover:border-green-600/70 hover:bg-green-950/30">
            <p className="text-xs uppercase tracking-[0.14em] text-green-600">Aprovar Saque</p>
            <p className="mt-2 text-2xl font-black text-green-200">{pendingCount}</p>
            <p className="mt-1 text-sm text-green-500">Solicitacoes pendentes de revisao.</p>
          </Link>
          <Link href="/admin/withdrawals/aprovados" className="rounded-xl border border-green-800/60 bg-black/40 p-4 transition hover:border-green-600/70 hover:bg-green-950/30">
            <p className="text-xs uppercase tracking-[0.14em] text-green-600">Saques Aprovados</p>
            <p className="mt-2 text-2xl font-black text-green-200">{approvedCount}</p>
            <p className="mt-1 text-sm text-green-500">Saques ja aprovados pela equipe.</p>
          </Link>
          <Link href="/admin/withdrawals/rejeitados" className="rounded-xl border border-green-800/60 bg-black/40 p-4 transition hover:border-green-600/70 hover:bg-green-950/30">
            <p className="text-xs uppercase tracking-[0.14em] text-green-600">Saques Rejeitados</p>
            <p className="mt-2 text-2xl font-black text-green-200">{rejectedCount}</p>
            <p className="mt-1 text-sm text-green-500">Historico de recusas e estornos.</p>
          </Link>
        </section>
      )}
    </div>
  );
}
