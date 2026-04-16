import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Inventário
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Seus recursos Gold
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Veja seu saldo em coins, tickets e chaves. Este é o seu centro de recursos.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Coins</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffcf57]">1.250</h2>
            <p className="loot-muted mt-4 text-sm leading-7">
              Saldo disponível para comprar ouro, boosts ou itens especiais.
            </p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Tickets</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#8dd0ff]">12</h2>
            <p className="loot-muted mt-4 text-sm leading-7">
              Use tickets para girar roletas, resgatar brindes ou desbloquear ofertas.
            </p>
          </article>

          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#f7ba2c]">Chaves</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffd76a]">4</h2>
            <p className="loot-muted mt-4 text-sm leading-7">
              Chaves especiais para abrir baús de recompensa e recursos exclusivos.
            </p>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <h2 className="loot-title text-3xl font-black">Itens no inventário</h2>
          <ul className="mt-6 space-y-4 text-sm text-[#cdb991]">
            <li className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80 p-4">
              <strong>Espada de Ferro</strong> — item colecionável pronto para ser transferido.
            </li>
            <li className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80 p-4">
              <strong>Pele de Dragão</strong> — aparência especial para seu personagem.
            </li>
            <li className="rounded-2xl border border-[#fff1be]/10 bg-[#06121d]/80 p-4">
              <strong>Poção de Velocidade</strong> — ativável para entregas instantâneas.
            </li>
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para perfil
          </Link>
          <Link
            href="/" 
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para home
          </Link>
        </div>
      </main>
    </div>
  );
}
