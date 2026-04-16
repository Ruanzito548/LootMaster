import Link from "next/link";

export default function CoinsPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
            LM Coins
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Seu saldo Gold
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Gerencie seu saldo de coins e veja as ações rápidas disponíveis para você.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Saldo atual</p>
            <h2 className="loot-title mt-4 text-6xl font-black text-[#ffcf57]">2.480</h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Coins prontos para usar em compras, upgrades e resgate de brindes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold">
                Comprar coins
              </button>
              <button className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
                Resgatar ticket
              </button>
            </div>
          </article>

          <aside className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Dicas</p>
            <ul className="mt-5 space-y-4 text-sm text-[#cdb991]">
              <li>• Use coins para desbloquear ofertas de gold com desconto.</li>
              <li>• Converta tickets em giros na roleta para prêmios extras.</li>
              <li>• Guarde chaves para abrir baús lendários.</li>
            </ul>
          </aside>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para home
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
