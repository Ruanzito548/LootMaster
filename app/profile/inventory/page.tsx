"use client";

import Link from "next/link";

import { useProfileSession } from "../use-profile-session";

const rarityClass: Record<string, string> = {
  comum: "text-[#f8eed4]",
  raro: "text-[#8dd0ff]",
  epico: "text-[#d8a7ff]",
};

export default function InventoryPage() {
  const { status, profile } = useProfileSession();

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Carregando inventario...</p>
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
            <p className="loot-muted mt-3 text-sm">Faca login para ver seu inventario.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Entrar
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Inventario</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Seus recursos Gold</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Saldo em Loot Coins, tickets, chaves e itens vinculados a sua conta.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Loot Coins</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">{profile.lootCoins.toLocaleString("pt-BR")}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Saldo disponivel para compras no marketplace.</p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Tickets</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#8dd0ff]">{profile.tickets}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Use para roletas, brindes e vantagens sazonais.</p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#f7ba2c]">Chaves</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffd76a]">{profile.keys}</h2>
            <p className="loot-muted mt-4 text-sm leading-7">Necessarias para abrir baus e recompensas especiais.</p>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <h2 className="loot-title text-3xl font-black">Itens no inventario</h2>
          <ul className="mt-6 space-y-4 text-sm text-[#cdb991]">
            {profile.inventory.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <strong>{item.name}</strong>
                  <span className={`text-xs uppercase tracking-[0.16em] ${rarityClass[item.rarity] || "text-[#f8eed4]"}`}>
                    {item.rarity} • x{item.quantity}
                  </span>
                </div>
                <p className="loot-muted mt-2 text-xs">{item.category}</p>
                <p className="mt-1 text-sm">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para perfil
          </Link>
          <Link href="/" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para home
          </Link>
        </div>
      </main>
    </div>
  );
}
