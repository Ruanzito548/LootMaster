import Link from "next/link";

export default function RewardsRoulettePage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
            Roleta
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Tente a sorte
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Use seus tickets para girar a roleta e ganhar prêmios de inventário.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="space-y-4 text-[#cdb991]">
            <p>Gire a roleta abaixo e veja o que aparece em cada região:</p>
            <ul className="space-y-3">
              <li>• 10% chance de ganhar um baú dourado</li>
              <li>• 30% chance de ganhar coins extras</li>
              <li>• 60% chance de ganhar tickets ou chaves</li>
            </ul>
            <button className="loot-gold-button mt-4 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
              Girar agora
            </button>
          </div>
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
