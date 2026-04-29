"use client";

import Link from "next/link";

import { useProfileSession } from "../use-profile-session";

export default function ProfileHistoryPage() {
  const { status, profile } = useProfileSession();

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Carregando historico...</p>
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login necessario</h1>
            <p className="loot-muted mt-3 text-sm">Entre para consultar compras e vendas.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Ir para login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const buyCount = profile.transactions.filter((item) => item.type === "compra").length;
  const sellCount = profile.transactions.filter((item) => item.type === "venda").length;

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Historico</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Ultimas vendas e compras</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">Acompanhe todas as movimentacoes do perfil no marketplace.</p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.2em] text-[#8dd0ff]">Compras</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#8dd0ff]">{buyCount}</h2>
          </article>
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.2em] text-[#ffc94d]">Vendas</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffc94d]">{sellCount}</h2>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-col gap-6">
            {profile.transactions.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[#fff1be]/10 bg-[#06121d]/80 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="loot-title text-2xl font-black">{item.title}</h2>
                    <p className="loot-muted mt-2 text-sm">
                      Tipo: {item.type} • Status: {item.status} • {item.createdAtLabel}
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#ffcf57]">{item.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para perfil
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Ver inventario
          </Link>
        </div>
      </main>
    </div>
  );
}
