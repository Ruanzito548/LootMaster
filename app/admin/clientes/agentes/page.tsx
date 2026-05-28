import Link from "next/link";

import { getAdminDb } from "@/lib/firebase-admin";

import AgentesAdminClient from "./agentes-client";

export const dynamic = "force-dynamic";

type AgentRow = {
  uid: string;
  username: string;
  email: string;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};

export default async function AdminAgentesPage() {
  let rows: AgentRow[] = [];
  let loadError: string | null = null;

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("users")
      .where("isAgent", "==", true)
      .limit(500)
      .get();

    rows = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      return {
        uid: docRow.id,
        username: typeof data.username === "string" ? data.username : "--",
        email: typeof data.email === "string" ? data.email : "--",
        agentFeeSharePercent:
          typeof data.agentFeeSharePercent === "number" && Number.isFinite(data.agentFeeSharePercent)
            ? data.agentFeeSharePercent
            : 50,
        agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : "",
      };
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load agents.";
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Clientes</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Agentes</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-green-600">
              Ajuste a porcentagem da taxa da plataforma que cada agente recebe por compras dos clientes vinculados.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clientes"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Voltar para clientes
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

        <AgentesAdminClient rows={rows} />
      </main>
    </div>
  );
}
