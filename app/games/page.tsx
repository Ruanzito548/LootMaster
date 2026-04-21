import Link from "next/link";
import { games } from "../data/games";

function getGameCardStyle(gameId: string) {
  if (gameId === "tbc-anniversary") {
    return {
      backgroundImage:
        "linear-gradient(rgba(4,10,7,0.62),rgba(4,10,7,0.72)), url('/wallpapertbc.avif')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (gameId === "retail") {
    return {
      backgroundImage:
        "linear-gradient(rgba(5,10,24,0.62),rgba(5,10,24,0.75)), url('/midnightwallpaper.jpeg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (gameId === "classic-era") {
    return {
      backgroundImage:
        "linear-gradient(rgba(36,24,12,0.62),rgba(20,13,8,0.76)), url('/classicerawallpaper.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (gameId === "mist-of-pandaria") {
    return {
      backgroundImage:
        "linear-gradient(rgba(8,30,24,0.62),rgba(4,15,11,0.76)), url('/pandariawallpaper.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return {
    backgroundImage:
      "linear-gradient(180deg, rgba(18, 44, 84, 0.78), rgba(5, 12, 24, 0.9))",
  };
}

export default function GamesIndexPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Games Hub
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Escolha o game e continue sua compra
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Cada entrada abre sua vitrine dedicada com gold, boosts e contas.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="group relative min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-[#4dc6ff]/12 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#4dc6ff]/30 hover:shadow-[0_18px_38px_rgba(22,118,196,0.3)] sm:min-h-[24rem]"
              style={getGameCardStyle(game.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/52 via-black/18 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-65" />
              <div className="relative z-10 flex h-full items-end justify-between gap-4">
                <div className="max-w-[75%]">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b7e7ff]">{game.shortTitle}</p>
                  <h2 className="loot-title mt-2 text-3xl font-black leading-tight">{game.title}</h2>
                  <p className="loot-muted mt-4 text-sm leading-7 text-[#e5d4af]">{game.description}</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                    {game.tag}
                  </span>
                  <span className="rounded-full border border-[#84d5ff]/25 bg-[#0d3f7a]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff]">
                    Abrir
                  </span>
                </div>
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
