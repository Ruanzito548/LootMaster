import Link from "next/link";

export default function RewardsChestsPage() {
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
          {[
            { title: "Baú Comum", description: "Recompensas pequenas, itens úteis e tickets extras." },
            { title: "Baú Lendário", description: "Recompensas maiores, chaves raras e coins extras." },
          ].map((chest) => (
            <article key={chest.title} className="loot-panel rounded-[1.75rem] p-8">
              <h2 className="loot-title text-3xl font-black">{chest.title}</h2>
              <p className="loot-muted mt-4 text-base leading-7">{chest.description}</p>
              <button className="loot-gold-button mt-8 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Abrir baú
              </button>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/rewards"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para brindes
          </Link>
          <Link
            href="/profile/inventory"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Ver inventário
          </Link>
        </div>
      </main>
    </div>
  );
}
