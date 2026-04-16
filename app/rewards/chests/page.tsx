"use client";

import Link from "next/link";
import { useState } from "react";

const chests = [
  {
    id: "common",
    title: "Baú Comum",
    description: "Recompensas pequenas, itens úteis e tickets extras.",
    rewards: ["+100 coins", "+1 ticket", "Item comum"],
  },
  {
    id: "legendary",
    title: "Baú Lendário",
    description: "Recompensas maiores, chaves raras e coins extras.",
    rewards: ["+500 coins", "+2 tickets", "Chave lendária"],
  },
];

function getChestReward(rewards: string[]) {
  return rewards[Math.floor(Math.random() * rewards.length)];
}

export default function RewardsChestsPage() {
  const [opened, setOpened] = useState<Record<string, string | null>>({
    common: null,
    legendary: null,
  });

  const openChest = (chestId: string, rewards: string[]) => {
    setOpened((current) => ({
      ...current,
      [chestId]: getChestReward(rewards),
    }));
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Baús
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Abra seus baús
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Escolha entre baús comuns e lendários para ganhar itens, coins e tickets.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {chests.map((chest) => (
            <article key={chest.id} className="loot-panel rounded-[1.75rem] p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="loot-title text-3xl font-black">{chest.title}</h2>
                  <p className="loot-muted mt-4 text-base leading-7">{chest.description}</p>
                </div>
                <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                  Teste
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="button"
                  onClick={() => openChest(chest.id, chest.rewards)}
                  className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
                >
                  Abrir baú
                </button>

                {opened[chest.id] ? (
                  <div className="rounded-[1.5rem] border border-[#fff1be]/10 bg-[#06121d]/80 p-5 text-sm">
                    <p className="loot-title text-xl font-black">Recompensa obtida</p>
                    <p className="loot-muted mt-3">{opened[chest.id]}</p>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-[#fff1be]/10 bg-[#06121d]/80 p-5 text-sm text-[#cdb991]">
                    Abra o baú para ver o resultado.
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/rewards" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para brindes
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Ver inventário
          </Link>
        </div>
      </main>
    </div>
  );
}
