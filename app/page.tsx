import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { games, serviceCategories } from "./data/games";

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-10 lg:px-8">
        <HotGames />

        <section id="service-lanes" className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#4be3c1]">Service Lanes</p>
            <h2 className="text-4xl font-black text-[#eaf4ff]">Choose your trading intent</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {serviceCategories.map((category) => (
              <article
                key={category.id}
                className="group rounded-[1.1rem] border border-[#2f6aa1]/42 bg-[linear-gradient(180deg,rgba(35,50,78,0.84),rgba(24,34,55,0.9))] p-5 transition hover:-translate-y-1 hover:border-[#48cfff]/48"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[#89c4e6]">{category.id}</p>
                <h3 className="mt-3 text-2xl font-black text-[#eef6ff]">{category.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#aec5dc]">{category.description}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#69dbff]/88 group-hover:text-[#97e8ff]">
                  Available in selected games
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="game-grid" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#4be3c1]">Game Grid</p>
              <h2 className="text-4xl font-black text-[#eaf4ff]">Open your game route</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#aec5dc]">
              Every card below points directly to the live game route and keeps the same purchase funnel.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.id}
                className="relative overflow-hidden rounded-[1.15rem] border border-[#2f6aa1]/46 bg-[linear-gradient(180deg,rgba(34,49,76,0.8),rgba(20,31,50,0.92))] p-6"
                style={
                  game.id === "tbc-anniversary"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(8,20,38,0.5),rgba(8,20,38,0.7)), url('/wow/wow-tbc/tbc-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "retail"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(8,20,38,0.5),rgba(8,20,38,0.7)), url('/wow/wow-retail/midinight-logo.jpeg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "classic-era"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(18,15,11,0.52),rgba(18,15,11,0.72)), url('/wow/wow-classic-era/classic-era-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "mist-of-pandaria"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(7,30,25,0.48),rgba(7,30,25,0.7)), url('/wow/wow-pandaria/pandaria-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="absolute right-4 top-4 rounded-md border border-[#f3c84f]/46 bg-[#f3c84f]/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffe4a3]">
                  {game.tag}
                </div>

                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9fd3ee]">{game.shortTitle}</p>
                  <h3 className="mt-2 text-3xl font-black text-[#edf6ff]">{game.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#cfdfef]">{game.description}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {serviceCategories.map((category) => (
                      <span
                        key={`${game.id}-${category.id}`}
                        className="rounded-md border border-[#3a79b6]/46 bg-[#10243e]/72 px-3 py-1 text-xs font-semibold text-[#d0e8f8]"
                      >
                        {category.title}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/games/${game.id}`}
                      className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold"
                    >
                      Enter {game.shortTitle}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[1.15rem] border border-[#2f6aa1]/44 bg-[linear-gradient(100deg,rgba(34,49,76,0.84),rgba(21,33,54,0.9))] p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#4be3c1]">Ready To Deploy</p>
              <h2 className="mt-3 text-4xl font-black text-[#eaf4ff]">Jump from homepage to checkout with less friction</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#aec5dc]">
                This homepage is rebuilt from scratch with stronger hierarchy, clearer actions and direct links into every game route.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/games" className="loot-gold-button inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Browse games
              </Link>
              <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Open rewards
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
