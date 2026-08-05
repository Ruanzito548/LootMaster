"use client";

import Link from "next/link";

import { useProfileSession } from "@/app/profile/use-profile-session";

export default function PainelAgentePage() {
  const { status, profile } = useProfileSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm text-slate-400">Carregando painel do agente...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !profile) {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-200">Faca login para acessar o painel do agente.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/20"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  if (profile.isAgent !== true) {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <p className="text-sm font-semibold text-rose-200">Seu usuario nao possui permissao de agente para este painel.</p>
          <Link
            href="/profile"
            className="mt-3 inline-flex rounded-lg border border-rose-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20"
          >
            Voltar ao perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Painel do Agente</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Bem-vindo, {profile.username}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Este espaco e dedicado para acompanhar carteira de clientes, comissoes e performance de indicacoes.
            Estrutura inicial publicada para acesso direto dos agentes.
          </p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Clientes vinculados</p>
            <p className="mt-2 text-2xl font-black text-cyan-300">Em breve</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Comissoes pendentes</p>
            <p className="mt-2 text-2xl font-black text-amber-300">Em breve</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Comissoes pagas</p>
            <p className="mt-2 text-2xl font-black text-emerald-300">Em breve</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Retencao 30 dias</p>
            <p className="mt-2 text-2xl font-black text-fuchsia-300">Em breve</p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Proximo passo</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Acesso do agente ja esta habilitado na navbar. Podemos evoluir este painel conectando os dados reais de
            clientes vinculados e comissoes por pedido.
          </p>
        </section>
      </main>
    </div>
  );
}
