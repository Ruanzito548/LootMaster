import Link from "next/link";

import AgentesAdminClient from "./agentes-client";

export const dynamic = "force-dynamic";

export default function AdminAgentesPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Clientes</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Parceiros</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-green-600">
              Ajuste a porcentagem da taxa da plataforma que cada parceiro recebe por compras dos clientes vinculados.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-green-700">
              Carregamento incremental dos parceiros mais recentes do painel.
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
              Voltar para o admin
            </Link>
          </div>
        </div>

        <AgentesAdminClient />
      </main>
    </div>
  );
}
