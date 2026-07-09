import Link from "next/link";

import { AdminChecklistClient } from "./page-client";

export default function AdminChecklistPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
            <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">Checklist</h1>
            <p className="max-w-2xl text-sm leading-7 text-green-600 sm:text-base">
              Organize tarefas internas, acompanhe o progresso e mantenha prioridades visiveis.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>

        <section className="mt-8">
          <AdminChecklistClient />
        </section>
      </main>
    </div>
  );
}