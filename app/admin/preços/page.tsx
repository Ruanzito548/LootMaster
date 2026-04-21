import Link from "next/link";

const games = [
  {
    id: "wow",
    title: "World of Warcraft",
    description: "Gerencie gold-settings, accounts e boosts do WOW.",
  },
  {
    id: "albion",
    title: "Albion Online",
    description: "Area reservada para configuracoes de precos do Albion.",
  },
  {
    id: "runescape",
    title: "Runescape",
    description: "Area reservada para configuracoes de precos do Runescape.",
  },
];

export default function PrecosPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Precos</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Escolha o jogo que deseja editar.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/admin/preços/${game.id}`}
              className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
            >
              <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Game</p>
              <h2 className="loot-title mt-4 text-3xl font-black">{game.title}</h2>
              <p className="loot-muted mt-4 text-base leading-8">{game.description}</p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/admin"
            className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to admin
          </Link>
        </div>
      </main>
    </div>
  );
}
