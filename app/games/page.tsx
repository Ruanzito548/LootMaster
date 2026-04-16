import Link from "next/link";
import { games } from "../data/games";

export default function GamesIndexPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Grade de jogos
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Todos os jogos disponíveis
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Navegue pelos jogos que operamos e abra a página de venda de cada um.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="loot-title text-3xl font-black">{game.title}</h2>
                  <p className="loot-muted mt-4 text-sm leading-7">{game.description}</p>
                </div>
                <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                  {game.tag}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para home
          </Link>
          <Link
            href="/coins"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Ver LM Coins
          </Link>
        </div>
      </main>
    </div>
  );
}
